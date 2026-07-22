"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, ShieldCheck, Clock, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { get2FAEmail, get2FAUid } from "@/lib/auth-session";
import { toast } from "sonner";

export default function OTPPage() {
  const router = useRouter();
  const { user, verifyOTP, resendOTP } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const email = user?.email || get2FAEmail() || "";
  const uid = user?.uid || get2FAUid() || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user && !uid) router.replace("/auth/login");
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [mounted, user, uid, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (countdown <= 0) {
      const id = setTimeout(() => setResendDisabled(false), 0);
      return () => clearTimeout(id);
    }
  }, [countdown]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const v = value.slice(-1);
    const next = [...otp];
    next[index] = v;
    setOtp(next);
    if (v && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setOtp(pasted.split(""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    
    if (code.length !== 6) {
      setError("Veuillez entrer les 6 chiffres du code");
      return;
    }
    
    setLoading(true);
    try {
      await verifyOTP(email, code);
      toast.success("Authentification réussie");
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!uid || !email) return;
    setResendDisabled(true);
    setCountdown(60);
    setError("");
    try {
      await resendOTP(uid, email, user?.displayName || "");
      toast.success("Code renvoyé");
    } catch {
      toast.error("Erreur lors du renvoi");
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  return (
    <AuthShell
      badge="Vérification sécurisée"
      title="Vérifiez votre identité"
      subtitle="Entrez le code à 6 chiffres reçu par email"
    >
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Email Display with Animation */}
        {email && (
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[var(--violet-soft)] to-transparent border border-[var(--violet-border)]/30">
              <ShieldCheck className="w-4 h-4 text-[var(--violet)]" />
              <p className="text-sm text-[var(--text-2)]">
                Code envoyé à <span className="font-semibold text-[var(--text)]">{email}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* OTP Input Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
            <div className="grid grid-cols-6 gap-3" onPaste={handlePaste}>
            {otp.map((digit, i) => {
              const isActive = focusedIndex === i;
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Input
                    ref={(el) => { if (el) inputRefs.current[i] = el; }}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={() => setFocusedIndex(i)}
                    onBlur={() => setFocusedIndex(null)}
                    className="w-full h-16 text-center text-2xl font-bold font-mono rounded-xl transition-all"
                    style={{
                      background: "var(--bg-muted)",
                      border: `2px solid ${isActive ? "var(--violet)" : digit ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: "var(--text)",
                      boxShadow: isActive ? "0 0 20px rgba(124,58,237,0.3)" : digit ? "0 4px 12px rgba(124,58,237,0.15)" : "none",
                    }}
                    required
                  />
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center justify-center gap-2 text-sm p-4 rounded-xl border border-[var(--error)]/20 bg-gradient-to-r from-[var(--error-soft)] to-transparent text-[var(--error)] shadow-lg"
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full h-14 rounded-xl shadow-lg shadow-[var(--violet)]/20 hover:shadow-[var(--violet)]/30 transition-all" 
              disabled={loading}
            >
              {loading ? (
                <motion.div 
                  className="inline-flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Vérification...
                </motion.div>
              ) : (
                <span className="inline-flex items-center justify-center gap-2.5">
                  <Sparkles className="w-5 h-5" />
                  Accéder au dashboard
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.form>

        {/* Footer Actions */}
        <motion.div 
          className="flex items-center justify-between pt-6 border-t border-[var(--border)]/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()} 
            className="text-sm text-[var(--text-2)] hover:text-[var(--text)] inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleResend} 
            disabled={resendDisabled || loading} 
            className="text-sm font-semibold text-[var(--violet)] hover:opacity-80 transition-opacity inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendDisabled ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Renvoyer ({countdown}s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="w-4 h-4" />
                Renvoyer le code
              </span>
            )}
          </motion.button>
        </motion.div>
      </div>
    </AuthShell>
  );
}
