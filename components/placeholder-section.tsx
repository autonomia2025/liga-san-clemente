export function PlaceholderSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <div className="flex flex-1 animate-fade-in items-center justify-center rounded-lg border border-dashed border-border">
        <p className="max-w-sm text-center text-sm text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
