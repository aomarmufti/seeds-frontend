import ComingSoon from '@/components/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="Payments"
      intro="What you have been charged, lesson by lesson."
      legacy="spLoadPaymentHistory()"
    />
  );
}
