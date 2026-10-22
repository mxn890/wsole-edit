import Script from 'next/script';
import shell from '../data/shell.json';
export default function Home(){return <><div id="storefront-root" dangerouslySetInnerHTML={{__html:shell}}/><Script src="/storefront.js" strategy="afterInteractive"/></>}
