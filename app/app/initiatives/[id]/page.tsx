export default function InitiativeDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Initiative</h2>
      <p className="text-sm text-muted-foreground">{params.id}</p>
    </div>
  )
}
