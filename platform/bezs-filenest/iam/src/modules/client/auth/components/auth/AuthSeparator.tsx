function AuthSeparator() {
  return (
    <div className="flex items-center gap-2">
      <div
        data-orientation="horizontal"
        role="none"
        data-slot="separator-root"
        className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px !w-auto grow"
      />
      <span className="shrink-0 text-muted-foreground text-sm">
        Or continue with
      </span>
      <div
        data-orientation="horizontal"
        role="none"
        data-slot="separator-root"
        className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px !w-auto grow"
      />
    </div>
  );
}

export default AuthSeparator;
