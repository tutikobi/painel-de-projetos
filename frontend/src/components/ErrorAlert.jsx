export default function ErrorAlert({ children }) {
  if (!children) return null;
  return (
    <p className="error-box" role="alert">
      {children}
    </p>
  );
}
