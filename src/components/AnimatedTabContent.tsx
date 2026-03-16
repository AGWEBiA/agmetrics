import { motion } from "framer-motion";
import { TabsContent } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface AnimatedTabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function AnimatedTabContent({ value, children, className = "" }: AnimatedTabContentProps) {
  return (
    <TabsContent value={value} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </TabsContent>
  );
}
