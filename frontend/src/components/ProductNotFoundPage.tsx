import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PackageSearch } from "lucide-react";

interface ProductNotFoundPageProps {
  /** Main heading shown below the icon. */
  heading?: string;
  /** Explanatory sub-text. */
  message?: string;
  /** Seconds before auto-redirect to /products (default: 3). */
  redirectAfter?: number;
}

export function ProductNotFoundPage({
  heading = "Product not found",
  message = "The product you're looking for doesn't exist or may have been deleted.",
  redirectAfter = 3,
}: ProductNotFoundPageProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(redirectAfter);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          navigate("/products");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current!);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <PackageSearch className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{heading}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Redirecting to catalogue in{" "}
        <span className="tabular-nums text-foreground">{countdown}</span>s…
      </p>
      <Link
        to="/products"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-[#2E3330] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3a3f3c]"
      >
        <ArrowLeft className="h-4 w-4" />
        Go to Catalogue
      </Link>
    </div>
  );
}
