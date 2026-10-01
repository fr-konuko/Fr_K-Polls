"use client";

export function DeleteAspirantForm({
  action,
  aspirantId,
  aspirantName,
  hasVotes,
}: {
  action: (formData: FormData) => Promise<void>;
  aspirantId: string;
  aspirantName: string;
  hasVotes: boolean;
}) {
  return (
    <form
      className="delete-aspirant-form"
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${aspirantName}? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="aspirantId" value={aspirantId} />
      <button
        className="button-danger"
        type="submit"
        disabled={hasVotes}
        title={hasVotes ? "Candidates with votes cannot be deleted." : `Delete ${aspirantName}`}
        aria-label={`Delete ${aspirantName}`}
      >
        Delete
      </button>
    </form>
  );
}