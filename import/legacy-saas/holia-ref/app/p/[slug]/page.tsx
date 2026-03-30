import { redirect } from 'next/navigation';

interface RedirectProps {
  params: { slug: string };
}

export default function RedirectPage({ params }: RedirectProps) {
  redirect(`/praticien/${params.slug}`);
}