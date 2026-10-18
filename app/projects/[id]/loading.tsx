export default function ProjectLoading() {
  return (
    <div className="stack-lg" aria-busy="true" aria-label="Loading project">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-bar" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );
}
