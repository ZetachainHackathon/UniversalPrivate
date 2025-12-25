"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Shield, Globe, Zap, Lock } from "lucide-react";
import { Button } from "@repo/ui/components/button";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-purple-500/30 overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[100px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[40%] bg-indigo-600/10 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            {/* Navigation */}
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto"
            >
                <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                        UniversalPrivate
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="https://github.com/ZetachainHackathon/UniversalPrivate" target="_blank" className="text-gray-400 hover:text-white transition-colors">
                        <GithubIcon className="w-6 h-6" />
                    </Link>
                    <Link href="/login">
                        <Button variant="outline" className="rounded-full px-6 border-white/10 hover:bg-white/10 hover:text-white text-white bg-white/5 backdrop-blur-sm transition-all">
                            Launch App
                        </Button>
                    </Link>
                </div>
            </motion.nav>

            <main className="relative z-10 flex flex-col items-center justify-center pt-20 pb-32 px-4 text-center">

                {/* Hero Section */}
                <div className="max-w-4xl mx-auto space-y-8">

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
                    >
                        <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
                            True Privacy for
                        </span>
                        <span className="block text-white">
                            Every Transaction
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Experience the future of decentralized finance with zero-knowledge technology.
                        Anonymous, secure, and cross-chain compatible.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <Link href="/login" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto h-12 px-8 rounded-full text-lg bg-white text-black hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                                Get Started
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                        <Link href="https://github.com/ZetachainHackathon/UniversalPrivate#readme" target="_blank" className="w-full sm:w-auto">
                            <Button variant="ghost" className="w-full sm:w-auto h-12 px-8 rounded-full text-lg text-gray-300 hover:text-white hover:bg-white/5">
                                Read Documentation
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
                    <FeatureCard
                        icon={<Shield className="w-8 h-8 text-purple-400" />}
                        title="Zero-Knowledge"
                        description="Your financial data remains completely private. Only you hold the keys to view your history."
                        delay={0.8}
                    />
                    <FeatureCard
                        icon={<Globe className="w-8 h-8 text-blue-400" />}
                        title="Cross-Chain"
                        description="Seamlessly move assets across networks without compromising on privacy or security."
                        delay={0.9}
                    />
                    <FeatureCard
                        icon={<Zap className="w-8 h-8 text-yellow-400" />}
                        title="Instant Settle"
                        description="Lightning fast transaction speeds powered by optimized ZK-SNARK circuits."
                        delay={1.0}
                    />
                </div>

            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 py-8 text-center text-gray-500 text-sm">
                <p>&copy; 2025 UniversalPrivate. Powered by Railgun.</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: delay }}
            className="group relative p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative z-10">
                <div className="mb-4 p-3 inline-block rounded-xl bg-black/50 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
                <p className="text-gray-400 leading-relaxed">
                    {description}
                </p>
            </div>
        </motion.div>
    );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
    )
}
