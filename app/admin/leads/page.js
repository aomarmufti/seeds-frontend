import ComingSoon from '@/components/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="Leads"
      intro="New enquiries and pending sign-ups."
      legacy="adRenderLeads()"
    />
  );
}
