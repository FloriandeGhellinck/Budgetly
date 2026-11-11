"use client";

import * as React from "react";
import { cn } from "cn";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@budgetly/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@budgetly/ui/components/drawer";
import { useIsMobile } from "@budgetly/ui/hooks/use-mobile";

// A form surface that is a bottom Drawer on phones (thumb reach) and a centred
// Dialog from the md breakpoint up. Controlled only: forms decide when to close.
const MobileContext = React.createContext(false);

type ResponsiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const Root = isMobile ? Drawer : Dialog;
  return (
    <MobileContext.Provider value={isMobile}>
      <Root open={open} onOpenChange={(next) => onOpenChange(next)}>
        {children}
      </Root>
    </MobileContext.Provider>
  );
}

function ResponsiveDialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = React.useContext(MobileContext);
  if (isMobile) {
    return (
      <DrawerContent data-slot="responsive-dialog-content">
        <div className={cn("flex min-h-0 flex-col gap-4 overflow-y-auto p-4", className)}>
          {children}
        </div>
      </DrawerContent>
    );
  }
  return (
    <DialogContent data-slot="responsive-dialog-content" className={cn("sm:max-w-md", className)}>
      {children}
    </DialogContent>
  );
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const isMobile = React.useContext(MobileContext);
  const Header = isMobile ? DrawerHeader : DialogHeader;
  return <Header className={cn(isMobile && "p-0", className)} {...props} />;
}

function ResponsiveDialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = React.useContext(MobileContext);
  const Title = isMobile ? DrawerTitle : DialogTitle;
  return <Title className={className}>{children}</Title>;
}

function ResponsiveDialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = React.useContext(MobileContext);
  const Description = isMobile ? DrawerDescription : DialogDescription;
  return <Description className={className}>{children}</Description>;
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  type ResponsiveDialogProps,
};
