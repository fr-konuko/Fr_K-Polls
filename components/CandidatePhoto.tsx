interface CandidatePhotoProps {
  name: string;
  url?: string;
}

export function CandidatePhoto({ name, url }: CandidatePhotoProps) {
  if (url) {
    // External candidate images are admin-validated HTTPS URLs. Keeping them
    // unoptimized avoids granting arbitrary remote hosts access to the image proxy.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="candidate-photo" src={url} alt="" referrerPolicy="no-referrer" />;
  }

  return (
    <span className="candidate-photo candidate-initials" aria-hidden="true">
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
