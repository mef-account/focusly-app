export default function ViewDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">View</h2>
      <p className="text-sm text-muted-foreground">{params.id}</p>
    </div>
  )
}
