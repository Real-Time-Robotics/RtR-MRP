"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";

interface AIQuickActionProps {
  context: {
    type: "part" | "supplier" | "bom" | "general";
    id?: string;
    name?: string;
  };
}

export function AIQuickAction({ context }: AIQuickActionProps) {
  const router = useRouter();

  const getQuestions = () => {
    switch (context.type) {
      case "part":
        return [
          `Lam sao giam chi phi ${context.name}?`,
          `Co substitute nao cho ${context.name}?`,
          `Nen Make hay Buy ${context.name}?`,
        ];
      case "supplier":
        return [
          `Co hoi negotiate voi ${context.name}?`,
          `Co supplier nao re hon ${context.name}?`,
        ];
      case "bom":
        return [
          "Top 5 co hoi giam chi phi?",
          "Phan tich Make vs Buy tong the?",
        ];
      default:
        return [
          "Top 5 co hoi giam chi phi?",
          "Tien do giam chi phi the nao?",
        ];
    }
  };

  const askAI = (question: string) => {
    router.push(
      `/cost-optimization/advisor?q=${encodeURIComponent(question)}`
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Bot className="w-4 h-4 mr-1" />
          Ask AI
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {getQuestions().map((q, i) => (
          <DropdownMenuItem key={i} onClick={() => askAI(q)}>
            <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
            {q}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
