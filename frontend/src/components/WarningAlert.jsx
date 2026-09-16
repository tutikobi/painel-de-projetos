export default function WarningAlert({ title, children }) {
  return (
    <div className="warning-box" role="alert">
      <p className="warning-title">⚠ {title}</p>
      <p>{children}</p>
    </div>
  );
}
