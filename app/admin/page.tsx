import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, requireAdminPage } from "@/lib/auth";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeAspirant, serializePoll } from "@/lib/serialize";
import { aspirantCreateSchema, pollCreateSchema, pollUpdateSchema } from "@/lib/validation";
import { POSITIONS } from "@/lib/types";
import { DeletePollForm } from "@/components/DeletePollForm";

export const dynamic = "force-dynamic";

async function createPoll(formData: FormData) {
  "use server";
  await requireAdminPage();
  const input = pollCreateSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
  });
  await getAdminDb().collection("polls").add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
  revalidatePath("/admin");
}

async function addAspirant(formData: FormData) {
  "use server";
  await requireAdminPage();
  const input = aspirantCreateSchema.parse({
    pollId: formData.get("pollId"),
    name: formData.get("name"),
    position: formData.get("position"),
    imageUrl: formData.get("imageUrl"),
  });
  const db = getAdminDb();
  const poll = await db.collection("polls").doc(input.pollId).get();
  if (!poll.exists || poll.get("status") === "archived") {
    throw new Error("Select a valid, non-archived poll.");
  }
  await db.collection("aspirants").add({
    ...input,
    votes: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  revalidatePath("/admin");
}

async function setPollStatus(formData: FormData) {
  "use server";
  await requireAdminPage();
  const pollId = String(formData.get("pollId") ?? "");
  const { status } = pollUpdateSchema.parse({ status: formData.get("status") });
  await getAdminDb().collection("polls").doc(pollId).update({
    status,
    closedAt: status === "closed" ? FieldValue.serverTimestamp() : null,
    archivedAt: status === "archived" ? FieldValue.serverTimestamp() : null,
  });
  revalidatePath("/admin");
}

async function deletePoll(formData: FormData) {
  "use server";
  await requireAdminPage();
  const pollId = String(formData.get("pollId") ?? "");
  if (!pollId) throw new Error("Select a poll to delete.");

  const db = getAdminDb();
  const pollRef = db.collection("polls").doc(pollId);
  if (!(await pollRef.get()).exists) throw new Error("Poll not found.");

  await pollRef.update({ status: "archived", archivedAt: FieldValue.serverTimestamp() });
  const [aspirants, votes] = await Promise.all([
    db.collection("aspirants").where("pollId", "==", pollId).get(),
    db.collection("votes").where("pollId", "==", pollId).get(),
  ]);
  const documents = [...aspirants.docs, ...votes.docs];

  for (let offset = 0; offset < documents.length; offset += 450) {
    const batch = db.batch();
    for (const document of documents.slice(offset, offset + 450)) batch.delete(document.ref);
    await batch.commit();
  }

  await pollRef.delete();
  revalidatePath("/admin");
  redirect("/admin");
}

async function logout() {
  "use server";
  (await cookies()).set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  redirect("/");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ poll?: string }>;
}) {
  await requireAdminPage();
  const db = getAdminDb();
  const pollSnapshot = await db.collection("polls").orderBy("createdAt", "desc").limit(100).get();
  const polls = pollSnapshot.docs.map(serializePoll);
  const requestedPoll = (await searchParams).poll;
  const selectedPoll = polls.find((poll) => poll.id === requestedPoll) ?? polls[0];
  const aspirants =
    selectedPoll && selectedPoll.status !== "archived"
      ? (await db.collection("aspirants").where("pollId", "==", selectedPoll.id).limit(500).get()).docs.map(serializeAspirant)
      : [];

  return (
    <main className="shell page stack">
      <header className="admin-header">
        <div>
          <span className="eyebrow eyebrow-blue">Protected workspace</span>
          <h1>Poll administration</h1>
          <p className="muted">This route is not linked from the public website.</p>
        </div>
        <form action={logout}><button className="button-secondary">Sign out</button></form>
      </header>

      <section className="two-column">
        <form className="card stack" action={createPoll}>
          <h2>Create poll</h2>
          <label htmlFor="poll-name">Poll name
            <input id="poll-name" name="name" maxLength={120} required />
          </label>
          <label htmlFor="poll-description">Description
            <textarea id="poll-description" name="description" maxLength={500} />
          </label>
          <label htmlFor="poll-status">Initial status
            <select id="poll-status" name="status">
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <button>Create poll</button>
        </form>

        <section className="card stack">
          <h2>Polls</h2>
          {!polls.length && <p className="muted">No polls have been created.</p>}
          {polls.map((poll) => (
            <Link className="admin-poll" href={"/admin?poll=" + poll.id} key={poll.id}>
              <span><strong>{poll.name}</strong><br /><small>{poll.status}</small></span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      </section>

      {selectedPoll && (
        <section className="card stack">
          <div className="admin-poll">
            <div>
              <h2>{selectedPoll.name}</h2>
              <span className="pill">{selectedPoll.status}</span>
            </div>
            <div className="admin-poll-actions">
              {selectedPoll.status !== "archived" && (
                <>
                <form action={setPollStatus}>
                  <input type="hidden" name="pollId" value={selectedPoll.id} />
                  <input type="hidden" name="status" value={selectedPoll.status === "active" ? "closed" : "active"} />
                  <button>{selectedPoll.status === "active" ? "Close poll" : "Reopen poll"}</button>
                </form>
                <form action={setPollStatus}>
                  <input type="hidden" name="pollId" value={selectedPoll.id} />
                  <input type="hidden" name="status" value="archived" />
                  <button className="button-danger">Archive poll</button>
                </form>
                </>
              )}
              <DeletePollForm action={deletePoll} pollId={selectedPoll.id} pollName={selectedPoll.name} />
            </div>
          </div>
        </section>
      )}

      {selectedPoll && selectedPoll.status !== "archived" && (
        <section className="two-column">
          <form className="card stack" action={addAspirant}>
            <h2>Add aspirant</h2>
            <input type="hidden" name="pollId" value={selectedPoll.id} />
            <label htmlFor="candidate-name">Full name
              <input id="candidate-name" name="name" maxLength={120} required />
            </label>
            <label htmlFor="candidate-position">Position
              <select id="candidate-position" name="position" required>
                {POSITIONS.map((position) => <option key={position}>{position}</option>)}
              </select>
            </label>
            <label htmlFor="candidate-image">HTTPS image URL
              <input id="candidate-image" name="imageUrl" type="url" maxLength={2000} />
            </label>
            <button>Add aspirant</button>
          </form>

          <section className="card stack">
            <h2>Current aspirants</h2>
            {!aspirants.length && <p className="muted">No aspirants in this poll.</p>}
            {aspirants.map((aspirant) => (
              <div className="candidate" key={aspirant.id}>
                <CandidatePhoto name={aspirant.name} url={aspirant.imageUrl} />
                <div className="candidate-main">
                  <h3>{aspirant.name}</h3>
                  <span className="pill">{aspirant.position}</span>
                </div>
                <strong>{aspirant.votes}</strong>
              </div>
            ))}
          </section>
        </section>
      )}
    </main>
  );
}
