"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";

interface ConfirmOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
}

interface ConfirmDialogContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ title: "", description: "" });
    const [resolveRef, setResolveRef] = useState<(value: boolean) => void>(() => { });

    const confirm = useCallback((options: ConfirmOptions) => {
        setOptions(options);
        setOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolveRef(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        setOpen(false);
        resolveRef(true);
    };

    const handleCancel = () => {
        setOpen(false);
        resolveRef(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            resolveRef(false);
        }
    };

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{options.title}</DialogTitle>
                        <DialogDescription className="mt-2 text-base">
                            {options.description}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="border-2 border-black font-bold hover:bg-gray-100"
                        >
                            {options.cancelText || "取消"}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            className="bg-black text-white font-bold hover:bg-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                        >
                            {options.confirmText || "確認"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmDialogContext.Provider>
    );
}

export const useConfirm = () => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmDialogProvider");
    }
    return context;
};
