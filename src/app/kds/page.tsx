import KDSClient from './KDSClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
    title: 'KDS - Restaurant OS',
};

export default function KDSPage() {
    return <KDSClient />;
}
