export default function PageNotAvalible() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 px-4">
      <h1 className="text-9xl font-extrabold text-indigo-600">404</h1>
      <h2 className="mt-4 text-3xl md:text-4xl font-semibold">
        Page Not Found
      </h2>
      <p className="mt-2 text-lg text-gray-600 text-center">
        Sorry, the page you’re looking for doesn’t exist or has been moved.
      </p>
    </div>
  );
}
