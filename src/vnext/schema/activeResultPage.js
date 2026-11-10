import { TECH_DEMO } from '../hosting';
import resultPageProfile from './resultPageProfile';

export default resultPageProfile(TECH_DEMO ? 'techdemo' : 'result');
