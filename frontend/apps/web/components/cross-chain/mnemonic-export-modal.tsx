"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { exportCurrentWalletMnemonic } from "@/lib/railgun/wallet-actions";
import { Loader2, Copy, Check, Eye, EyeOff } from "lucide-react";

interface MnemonicExportModalProps {
    trigger: React.ReactNode;
}

export function MnemonicExportModal({ trigger }: MnemonicExportModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [mnemonic, setMnemonic] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Reset state when closing
            setPassword("");
            setMnemonic(null);
            setError(null);
            setIsLoading(false);
            setShowPassword(false);
            setIsCopied(false);
        }
    };

    const handleExport = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        setMnemonic(null);

        try {
            // 呼叫 wallet-actions 中的匯出函式
            const result = await exportCurrentWalletMnemonic(password);
            setMnemonic(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "密碼錯誤或無法匯出助記詞");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (mnemonic) {
            navigator.clipboard.writeText(mnemonic);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader>
                    <DialogTitle>匯出助記詞 (Export Mnemonic)</DialogTitle>
                    <DialogDescription>
                        請輸入您的密碼以解密並查看助記詞。請確保周圍沒有人正在窺視螢幕。
                    </DialogDescription>
                </DialogHeader>

                {!mnemonic ? (
                    <form onSubmit={handleExport} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-black"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || !password}
                            className="w-full bg-black text-white hover:bg-gray-800"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Reveal Mnemonic"
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-4 mt-2">
                        <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg relative break-all font-mono text-sm leading-6">
                            {mnemonic}
                            <button
                                onClick={handleCopy}
                                className="absolute top-2 right-2 p-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                title="Copy to clipboard"
                            >
                                {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        請勿將助記詞分享給任何人。擁有此助記詞的人可以完全控制您的資產。
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={() => handleOpenChange(false)}
                            className="w-full border-2 border-black bg-white text-black hover:bg-gray-100"
                        >
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
