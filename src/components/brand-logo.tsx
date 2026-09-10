import Image from "next/image";

export function BrandLogo() {
  return (
    <>
      <Image
        className="brand-logo"
        src="/interview-buddy.png"
        alt=""
        width={34}
        height={34}
        priority
      />{" "}
      <span>Interview Buddy</span>
    </>
  );
}
