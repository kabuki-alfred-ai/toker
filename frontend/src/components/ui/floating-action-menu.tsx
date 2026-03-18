"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingActionMenuProps = {
  options: {
    label: string;
    onClick: () => void;
    Icon?: React.ReactNode;
  }[];
  className?: string;
  triggerIcon?: React.ReactNode;
};

const FloatingActionMenu = ({
  options,
  className,
  triggerIcon,
}: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn("relative z-[110]", className)}>
      <Button
        onClick={toggleMenu}
        variant="outline"
        className={cn(
          "w-12 h-12 rounded-full shadow-lg border-2 border-primary/20 bg-background/80 backdrop-blur-md hover:bg-accent transition-all duration-300",
          isOpen ? "bg-primary text-primary-foreground border-primary" : "text-primary"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0, scale: isOpen ? 1.1 : 1 }}
          transition={{
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1],
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          {triggerIcon || <Sparkles className="w-6 h-6" />}
        </motion.div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close menu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[-1]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(4px)" }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 mb-2 w-max"
            >
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card/95 border border-border shadow-2xl backdrop-blur-xl min-w-[220px]">
                {options.map((option, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.05,
                    }}
                    className="w-full"
                  >
                    <Button
                      onClick={() => {
                        option.onClick();
                        setIsOpen(false);
                      }}
                      variant="ghost"
                      className="w-full flex items-center justify-start gap-4 px-5 py-4 h-14 hover:bg-primary/10 rounded-xl transition-colors font-medium text-foreground text-base"
                    >
                      <span className="text-primary w-5 flex-shrink-0">{option.Icon}</span>
                      <span>{option.label}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingActionMenu;
