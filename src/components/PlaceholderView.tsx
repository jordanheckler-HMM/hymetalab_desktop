const PlaceholderView = ({ title }: { title: string }) => {
    return (
        <div className="flex flex-1 items-center justify-center overflow-auto p-8">
            <div className="text-center">
                <h1 className="mb-4 text-4xl font-bold text-[var(--ui-text)]">{title}</h1>
                <p className="text-[var(--ui-text-muted)]">
                    This view is a placeholder for future functionality.
                </p>
            </div>
        </div>
    );
};

export default PlaceholderView;
