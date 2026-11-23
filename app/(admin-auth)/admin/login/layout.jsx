// The sign-in page sits outside app/admin so the admin layout's session check cannot redirect it to itself.
export const metadata = { title: "Admin — Epocheye", robots: { index: false, follow: false } };

export default function AdminLoginLayout({ children }) {
  return children;
}
