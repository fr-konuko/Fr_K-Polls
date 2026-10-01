"use client";

export function DeletePollForm({
  action,
  pollId,
  pollName,
}: {
  action: (formData: FormData) => Promise<void>;
  pollId: string;
  pollName: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Permanently delete "${pollName}" and all its candidates and votes? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pollId" value={pollId} />
      <button className="button-danger" type="submit">Delete poll</button>
    </form>
  );
}