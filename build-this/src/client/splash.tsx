import './styles.css';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';

function Splash(){return <main className="splash"><section className="launch"><div className="bolt">⚡</div><div className="eyebrow">LIVE DEMAND MARKET</div><h1>What should the internet build next?</h1><p>Turn real Reddit problems into ranked product demand. Support what you need. Claim what you can build. Ship it back to the people who asked.</p><button onClick={(e)=>requestExpandedMode(e.nativeEvent,'market')}>OPEN BUILD THIS</button></section></main>}
createRoot(document.getElementById('root')!).render(<Splash/>);
