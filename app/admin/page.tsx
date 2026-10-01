import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, requireAdminPage } from "@/lib/auth";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeAspirant, serializePoll } from "@/lib/serialize";
import { addAspirantToPoll } from "@/lib/admin-polls";
import { aspirantCreateSchema, pollCreateSchema, pollUpdateSchema } from "@/lib/validation";
import { POSITIONS } from "@/lib/types";
import { DeletePollForm } from "@/components/DeletePollForm";
import { DeleteAspirantForm } from "@/components/DeleteAspirantForm";

export const dynamic = "force-dynamic";

async function createPoll(formData: FormData) {
  "use server";
  await requireAdminPage();
  const input = pollCreateSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    position: formData.get("position"),
  });
  const reference = await getAdminDb().collection("polls").add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
  revalidatePath("/admin");
  redirect("/admin?tab=drafts&poll=" + reference.id);
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
  await addAspirantToPoll(getAdminDb(), input);
  revalidatePath("/admin");
}

async function deleteAspirant(formData: FormData) {
  "use server";
  await requireAdminPage();
  const aspirantId = String(formData.get("aspirantId") ?? "");
  if (!aspirantId) throw new Error("Select an aspirant to delete.");

  const db = getAdminDb();
  const aspirantRef = db.collection("aspirants").doc(aspirantId);
  await db.runTransaction(async (transaction) => {
    const aspirant = await transaction.get(aspirantRef);
    if (!aspirant.exists) throw new Error("Aspirant not found.");
    if (Number(aspirant.get("votes") ?? 0) > 0) {
      throw new Error("An aspirant with recorded votes cannot be deleted.");
    }
    transaction.delete(aspirantRef);
  });

  revalidatePath("/admin");
  revalidatePath("/vote");
  revalidatePath("/results");
}

async function setPollStatus(formData: FormData) {
  "use server";
  await requireAdminPage();
  const pollId = String(formData.get("pollId") ?? "");
  const { status } = pollUpdateSchema.parse({ status: formData.get("status") });
  const db = getAdminDb();
  const pollRef = db.collection("polls").doc(pollId);
  const poll = await pollRef.get();
  if (!poll.exists) throw new Error("Poll not found.");

  if (status === "active" && poll.get("status") === "draft") {
    if (!poll.get("position")) throw new Error("Add a position before publishing this poll.");
    const aspirants = await db.collection("aspirants").where("pollId", "==", pollId).limit(1).get();
    if (aspirants.empty) throw new Error("Add at least one aspirant before publishing this poll.");
  }

  await pollRef.update({
    status,
    closedAt: status === "closed" ? FieldValue.serverTimestamp() : null,
    archivedAt: status === "archived" ? FieldValue.serverTimestamp() : null,
  });
  revalidatePath("/admin");
  revalidatePath("/vote");
  revalidatePath("/results");
  if (status === "active") redirect("/admin?tab=published&poll=" + pollId);
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
  searchParams: Promise<{ poll?: string; tab?: string }>;
}) {
  await requireAdminPage();
  const db = getAdminDb();
  const pollSnapshot = await db.collection("polls").orderBy("createdAt", "desc").limit(100).get();
  const polls = pollSnapshot.docs.map(serializePoll);
  const params = await searchParams;
  const activeTab = params.tab === "published" ? "published" : "drafts";
  const visiblePolls = polls.filter((poll) =>
    activeTab === "drafts" ? poll.status === "draft" : poll.status !== "draft",
  );
  const requestedPoll = params.poll;
  const selectedPoll = polls.find((poll) => poll.id === requestedPoll) ?? visiblePolls[0];
  const aspirants =
    selectedPoll && selectedPoll.status !== "archived"
      ? (await db.collection("aspirants").where("pollId", "==", selectedPoll.id).limit(500).get()).docs.map(serializeAspirant)
      : [];
  const existingPositions = [...new Set(aspirants.map((aspirant) => aspirant.position))];
  const selectedPosition = selectedPoll?.position ?? (existingPositions.length === 1 ? existingPositions[0] : undefined);

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
          <label htmlFor="poll-description">Short description
            <textarea id="poll-description" name="description" maxLength={500} />
          </label>
          <label htmlFor="poll-position">Position
            <select id="poll-position" name="position" required defaultValue="">
              <option value="" disabled>Select a position</option>
              {POSITIONS.map((position) => <option key={position}>{position}</option>)}
            </select>
          </label>
          <p className="muted">New polls are saved as drafts until you publish them.</p>
          <button>Create draft</button>
        </form>

        <section className="card stack">
          <h2>Polls</h2>
          <nav className="admin-tabs" aria-label="Poll status tabs">
            <Link className={activeTab === "drafts" ? "admin-tab is-active" : "admin-tab"} href="/admin?tab=drafts">Drafts</Link>
            <Link className={activeTab === "published" ? "admin-tab is-active" : "admin-tab"} href="/admin?tab=published">Published</Link>
          </nav>
          {!visiblePolls.length && <p className="muted">No {activeTab} polls.</p>}
          {visiblePolls.map((poll) => (
            <Link className="admin-poll" href={`/admin?tab=${activeTab}&poll=${poll.id}`} key={poll.id}>
              <span><strong>{poll.name}</strong><br /><small>{poll.status === "active" ? "Published · Live" : poll.status}</small></span>
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
              <span className="pill">{selectedPoll.status === "active" ? "Published · Live" : selectedPoll.status}</span>
            </div>
            <div className="admin-poll-actions">
              {selectedPoll.status === "draft" ? (
                <form action={setPollStatus}>
                  <input type="hidden" name="pollId" value={selectedPoll.id} />
                  <input type="hidden" name="status" value="active" />
                  <button className="button-primary">Publish poll</button>
                </form>
              ) : selectedPoll.status !== "archived" ? (
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
              ) : null}
              <DeletePollForm action={deletePoll} pollId={selectedPoll.id} pollName={selectedPoll.name} />
            </div>
          </div>
        </section>
      )}

      {selectedPoll && selectedPoll.status !== "archived" && (
        <section className="two-column">
          {selectedPoll.status === "draft" ? (
            <form className="card stack" action={addAspirant}>
              <h2>Add aspirant</h2>
              <input type="hidden" name="pollId" value={selectedPoll.id} />
              <label htmlFor="candidate-name">Full name
                <input id="candidate-name" name="name" maxLength={120} required />
              </label>
              {selectedPosition ? (
                <>
                  <input type="hidden" name="position" value={selectedPosition} />
                  <p className="muted">Position: <strong>{selectedPosition}</strong></p>
                </>
              ) : (
                <label htmlFor="candidate-position">Position for this poll
                  <select id="candidate-position" name="position" required defaultValue="">
                    <option value="" disabled>Select a position</option>
                    {POSITIONS.map((position) => <option key={position}>{position}</option>)}
                  </select>
                </label>
              )}
              <label htmlFor="candidate-image">HTTPS image URL
                <input id="candidate-image" name="imageUrl" type="url" maxLength={2000} />
              </label>
              <button>Add aspirant</button>
            </form>
          ) : (
            <section className="card stack">
              <h2>Poll published</h2>
              <p className="muted">Candidates are locked after publication. Close the poll to stop voting; candidates can’t be added after it has been published.</p>
            </section>
          )}

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
                <DeleteAspirantForm
                  action={deleteAspirant}
                  aspirantId={aspirant.id}
                  aspirantName={aspirant.name}
                  hasVotes={aspirant.votes > 0}
                />
              </div>
            ))}
          </section>
        </section>
      )}
    </main>
  );
}
