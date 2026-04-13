"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  LuKeyRound as KeyRound,
  LuShieldCheck as ShieldCheck,
  LuMail as Mail,
  LuUser as User2,
} from "react-icons/lu";

import { login, register } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/forms";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  name: z.string().max(120, "Name is too long.").optional().or(z.literal("")),
});

type Mode = "login" | "register";

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const auth = useAuth();
  const isLogin = mode === "login";

  const form = useForm<LoginValues | RegisterValues>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: isLogin ? { email: "", password: "" } : { email: "", password: "", name: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginValues | RegisterValues) => {
      if (isLogin) {
        return login(values as LoginValues);
      }

      return register({
        ...(values as RegisterValues),
        name: (values as RegisterValues).name || undefined,
      });
    },
    onSuccess: (result) => {
      if (isLogin) {
        const loginResult = result as Awaited<ReturnType<typeof login>>;
        auth.setSession(loginResult.access_token, loginResult.user);
        router.push("/");
        return;
      }

      router.push("/login?registered=1");
    },
  });

  return (
    <div className="mx-auto max-w-lg mt-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center justify-center mb-8 gap-4 text-center">
        <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-lg ">
          {isLogin ? <KeyRound className="h-8 w-8 text-teal-400" /> : <ShieldCheck className="h-8 w-8 text-violet-400" />}
        </div>
        <SectionHeading
          title={isLogin ? "Welcome Back" : "Create Account"}
          description={
            isLogin
              ? "Authenticate securely with the NestJS backend and acquire your JWT access token."
              : "Register a secure application identity to preview and modify restricted backend functions."
          }
        />
      </div>

      <Card className="p-8 shadow-2xl relative overflow-hidden border-gray-200 bg-panel/60">
        <div className={`absolute top-0 right-0 w-64 h-64 -mr-32 -mt-32 rounded-full blur-3xl opacity-20 pointer-events-none ${isLogin ? 'bg-teal-500' : 'bg-violet-500'}`} />

        <form
          className="space-y-6 relative z-10"
          onSubmit={form.handleSubmit((values) => {
            mutation.mutate(values);
          })}
        >
          {!isLogin ? (
            <Field
              label="Full Name"
              error={("name" in form.formState.errors ? form.formState.errors.name?.message : undefined) as string | undefined}
              hint="You can skip this, our backend accommodates nullable fields."
            >
              <div className="relative">
                <Input placeholder="John Doe" {...form.register("name" as never)} />
              </div>
            </Field>
          ) : null}

          <Field
            label="Email Address"
            error={form.formState.errors.email?.message as string | undefined}
          >
            <div className="relative">
              <Input type="email" placeholder="user@example.com" {...form.register("email")} />
            </div>
          </Field>

          <Field
            label="Secure Password"
            error={form.formState.errors.password?.message as string | undefined}
          >
            <div className="relative">
              <Input type="password" placeholder="••••••••" {...form.register("password")} />
            </div>
          </Field>

          {mutation.isError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
              {mutation.error.message}
            </div>
          ) : null}

          <div className="pt-2 flex flex-col gap-5 sm:flex-row-reverse sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={mutation.isPending}
              className={`w-full sm:w-auto rounded-full px-8 py-3 text-sm font-bold shadow-lg transition-all disabled:opacity-60 disabled:shadow-none hover:scale-105 active:scale-95 ${isLogin
                ? "bg-teal-500 text-teal-950 hover:bg-teal-400 shadow-teal-500/25"
                : "bg-violet-500 text-gray-900 hover:bg-violet-400 shadow-violet-500/25"
                }`}
            >
              {mutation.isPending
                ? "Processing..."
                : isLogin
                  ? "Sign In"
                  : "Complete Registration"}
            </button>

            <p className="text-sm text-gray-400 text-center sm:text-left">
              {isLogin ? "Need access?" : "Have an account?"}{" "}
              <Link
                href={isLogin ? "/register" : "/login"}
                className={`font-semibold hover:underline ${isLogin ? 'text-teal-400' : 'text-violet-400'}`}
              >
                {isLogin ? "Create account" : "Log in"}
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
