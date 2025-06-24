import NotFoundError from "@/features/errors/not-found-error";

export default function Home() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <NotFoundError/>
    </div>
  );
}
