import ComingSoon from '@/components/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="Earnings"
      intro="What you have been paid, and what is still owed."
      legacy="earnLoadData()"
    />
  );
}
