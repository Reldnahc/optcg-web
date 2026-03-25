import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRandomCard } from "../api/hooks";

export function RandomRedirect() {
  const navigate = useNavigate();
  const { refetch } = useRandomCard();

  useEffect(() => {
    refetch().then((result) => {
      if (result.data?.data) {
        navigate(`/cards/${result.data.data.card_number}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    });
  }, [refetch, navigate]);

  return <div className="p-8 text-text-muted text-center">Finding a random card...</div>;
}
