// components/BrandLogo.jsx
export default function BrandLogo({ size = 28 }) {
  return (
    <img
      src="/icon.png"
      alt="Day Trader"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
