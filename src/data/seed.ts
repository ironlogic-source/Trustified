// =============================================================================
// FDR-Kavach: Deterministic Seed Data
// Government FDR Lifecycle Management Platform
//
// This file generates ~60 institutions, ~400 FDRs, ~30 bank branches,
// ~50 audit log entries, and alerts using a seeded PRNG for full
// determinism. It also plants exactly 5 anomalies for the detection engines.
//
// ANOMALIES PLANTED:
//   1. Duplicate FDR Number:  SBI/FD/2024/00847 used by two institutions
//   2. Tampered Amount:       bankReportedAmount mismatch on Indore FDR
//   3. Maturity Before Issue: Patna Polytechnic impossible dates
//   4. Missing Lien:          Coimbatore Institute lienMarked = false
//   5. Reused Document Hash:  Lucknow & Kanpur share identical hash
// =============================================================================

import type {
  FDR,
  FDRStatus,
  TrustTier,
  Institution,
  InstitutionType,
  BankBranch,
  AuditLogEntry,
  UserRole,
  Alert,
  AlertType,
} from '../engines/types';
import { buildPreImage, GENESIS_PREV_HASH } from '../engines/audit-log';

// =============================================================================
// § 1  Seeded PRNG — Linear Congruential Generator
// =============================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }

  /** Returns an integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick a single random element from an array. */
  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)]!;
  }

  /** Pick `count` distinct elements (Fisher-Yates partial shuffle). */
  pickMultiple<T>(arr: readonly T[], count: number): T[] {
    const copy = [...arr];
    const n = Math.min(count, copy.length);
    for (let i = 0; i < n; i++) {
      const j = this.nextInt(i, copy.length - 1);
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    return copy.slice(0, n);
  }

  /** Generate a hex string of the given byte-length (2 hex chars per byte). */
  hexString(bytes: number): string {
    const hexChars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < bytes * 2; i++) {
      result += hexChars[this.nextInt(0, 15)];
    }
    return result;
  }
}

const rng = new SeededRandom(42);

// =============================================================================
// § 2  Reference Date
// =============================================================================

/** Simulated "today" for the seed dataset. */
export const REFERENCE_DATE = '2026-10-27';

// =============================================================================
// § 3  Indian States & Districts
// =============================================================================

interface StateInfo {
  name: string;
  code: number; // AICTE state code prefix
  cities: string[];
}

const STATES: StateInfo[] = [
  { name: 'Andhra Pradesh',     code: 1,  cities: ['Vijayawada', 'Visakhapatnam', 'Tirupati', 'Guntur'] },
  { name: 'Bihar',              code: 3,  cities: ['Patna', 'Gaya', 'Muzaffarpur'] },
  { name: 'Chhattisgarh',       code: 4,  cities: ['Raipur', 'Bhilai', 'Bilaspur'] },
  { name: 'Delhi',              code: 5,  cities: ['New Delhi', 'Dwarka', 'Rohini'] },
  { name: 'Goa',                code: 6,  cities: ['Panaji', 'Margao'] },
  { name: 'Gujarat',            code: 7,  cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'] },
  { name: 'Haryana',            code: 8,  cities: ['Gurugram', 'Faridabad', 'Karnal'] },
  { name: 'Himachal Pradesh',   code: 9,  cities: ['Shimla', 'Mandi'] },
  { name: 'Jharkhand',          code: 10, cities: ['Ranchi', 'Jamshedpur'] },
  { name: 'Karnataka',          code: 11, cities: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru'] },
  { name: 'Kerala',             code: 12, cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kottayam'] },
  { name: 'Madhya Pradesh',     code: 13, cities: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'] },
  { name: 'Maharashtra',        code: 14, cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'] },
  { name: 'Odisha',             code: 16, cities: ['Bhubaneswar', 'Cuttack'] },
  { name: 'Punjab',             code: 17, cities: ['Chandigarh', 'Ludhiana', 'Amritsar'] },
  { name: 'Rajasthan',          code: 18, cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'] },
  { name: 'Tamil Nadu',         code: 19, cities: ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'] },
  { name: 'Telangana',          code: 20, cities: ['Hyderabad', 'Warangal', 'Nizamabad'] },
  { name: 'Uttar Pradesh',      code: 22, cities: ['Lucknow', 'Kanpur', 'Noida', 'Agra', 'Varanasi', 'Allahabad'] },
  { name: 'West Bengal',        code: 24, cities: ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur'] },
];

// =============================================================================
// § 4  Indian Name Generator Data
// =============================================================================

const FIRST_NAMES_MALE = [
  'Rajesh', 'Amit', 'Suresh', 'Vikram', 'Arun', 'Manoj', 'Deepak', 'Sanjay',
  'Ramesh', 'Pradeep', 'Ashok', 'Girish', 'Harish', 'Nitin', 'Pankaj',
  'Ravi', 'Kiran', 'Vinod', 'Ajay', 'Prakash', 'Sunil', 'Mohan', 'Gopal',
  'Naveen', 'Sachin', 'Rahul', 'Dinesh', 'Mukesh', 'Alok', 'Vivek',
];

const FIRST_NAMES_FEMALE = [
  'Sunita', 'Priya', 'Kavita', 'Anita', 'Meena', 'Lakshmi', 'Geeta',
  'Rekha', 'Shalini', 'Pooja', 'Nisha', 'Deepa', 'Savita', 'Rani',
  'Kamala', 'Usha', 'Sarita', 'Neha', 'Archana', 'Swati',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair',
  'Iyer', 'Rao', 'Pillai', 'Deshmukh', 'Joshi', 'Mishra', 'Tiwari',
  'Pandey', 'Dubey', 'Sinha', 'Banerjee', 'Mukherjee', 'Chatterjee',
  'Das', 'Ghosh', 'Bose', 'Sen', 'Menon', 'Kulkarni', 'Patil', 'Hegde',
  'Mahajan', 'Thakur', 'Chauhan', 'Yadav', 'Chopra', 'Malhotra',
];

function generateIndianName(): string {
  const isMale = rng.next() > 0.4;
  const first = isMale ? rng.pick(FIRST_NAMES_MALE) : rng.pick(FIRST_NAMES_FEMALE);
  const last = rng.pick(LAST_NAMES);
  return `${first} ${last}`;
}

function generatePhone(): string {
  const prefixes = ['98', '97', '96', '95', '94', '93', '91', '90', '88', '87', '86', '85', '70', '72', '73', '74', '75', '76', '77', '78', '79'];
  const prefix = rng.pick(prefixes);
  let rest = '';
  for (let i = 0; i < 8; i++) rest += rng.nextInt(0, 9).toString();
  return prefix + rest;
}

function generateEmail(instName: string): string {
  const slug = instName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(w => !['of', 'the', 'and', 'for', 'in'].includes(w))
    .slice(0, 3)
    .join('');
  return `nodal@${slug}.ac.in`;
}

// =============================================================================
// § 5  Institution Definitions (~60)
// =============================================================================

interface InstitutionDef {
  name: string;
  state: string;
  district: string;
  type: InstitutionType;
}

// Manually defined realistic AICTE-style institution names
const INSTITUTION_DEFS: InstitutionDef[] = [
  // ---- Anomaly institutions (MUST be present) ----
  { name: 'Raipur Institute of Technology, Raipur',         state: 'Chhattisgarh',    district: 'Raipur',            type: 'engineering' },   // 0
  { name: 'Bhilai Engineering College, Bhilai',             state: 'Chhattisgarh',    district: 'Durg',              type: 'engineering' },   // 1
  { name: 'Indore School of Architecture, Indore',          state: 'Madhya Pradesh',  district: 'Indore',            type: 'architecture' },  // 2
  { name: 'Patna Polytechnic, Patna',                       state: 'Bihar',           district: 'Patna',             type: 'polytechnic' },   // 3
  { name: 'Coimbatore Institute of Management, Coimbatore', state: 'Tamil Nadu',      district: 'Coimbatore',        type: 'management' },    // 4
  { name: 'Lucknow College of Engineering, Lucknow',        state: 'Uttar Pradesh',   district: 'Lucknow',           type: 'engineering' },   // 5
  { name: 'Kanpur Technical Institute, Kanpur',             state: 'Uttar Pradesh',   district: 'Kanpur Nagar',      type: 'engineering' },   // 6

  // ---- Andhra Pradesh ----
  { name: 'Rajiv Gandhi Institute of Technology, Vijayawada',  state: 'Andhra Pradesh',  district: 'Krishna',        type: 'engineering' },
  { name: 'Visakhapatnam College of Pharmacy, Visakhapatnam',  state: 'Andhra Pradesh',  district: 'Visakhapatnam',  type: 'pharmacy' },
  { name: 'Tirupati School of Management, Tirupati',           state: 'Andhra Pradesh',  district: 'Chittoor',       type: 'management' },

  // ---- Bihar ----
  { name: 'Nalanda Institute of Technology, Gaya',             state: 'Bihar',           district: 'Gaya',           type: 'engineering' },
  { name: 'Muzaffarpur College of Pharmacy, Muzaffarpur',      state: 'Bihar',           district: 'Muzaffarpur',    type: 'pharmacy' },

  // ---- Delhi ----
  { name: 'Delhi Institute of Engineering & Technology, New Delhi', state: 'Delhi',      district: 'New Delhi',      type: 'engineering' },
  { name: 'Dwarka School of Architecture, New Delhi',              state: 'Delhi',      district: 'South West Delhi', type: 'architecture' },

  // ---- Goa ----
  { name: 'Goa College of Engineering, Panaji',                state: 'Goa',            district: 'North Goa',      type: 'engineering' },

  // ---- Gujarat ----
  { name: 'Sardar Patel Institute of Technology, Ahmedabad',   state: 'Gujarat',        district: 'Ahmedabad',      type: 'engineering' },
  { name: 'Surat Polytechnic, Surat',                          state: 'Gujarat',        district: 'Surat',          type: 'polytechnic' },
  { name: 'Vadodara Institute of Pharmacy, Vadodara',          state: 'Gujarat',        district: 'Vadodara',       type: 'pharmacy' },
  { name: 'Rajkot Management Academy, Rajkot',                 state: 'Gujarat',        district: 'Rajkot',         type: 'management' },

  // ---- Haryana ----
  { name: 'Gurugram Institute of Technology, Gurugram',        state: 'Haryana',        district: 'Gurugram',       type: 'engineering' },
  { name: 'Faridabad Polytechnic, Faridabad',                  state: 'Haryana',        district: 'Faridabad',      type: 'polytechnic' },

  // ---- Himachal Pradesh ----
  { name: 'Himachal College of Engineering, Shimla',           state: 'Himachal Pradesh', district: 'Shimla',       type: 'engineering' },

  // ---- Jharkhand ----
  { name: 'Ranchi Institute of Technology, Ranchi',            state: 'Jharkhand',      district: 'Ranchi',         type: 'engineering' },
  { name: 'Jamshedpur Polytechnic, Jamshedpur',                state: 'Jharkhand',      district: 'East Singhbhum', type: 'polytechnic' },

  // ---- Karnataka ----
  { name: 'Bengaluru Institute of Technology, Bengaluru',      state: 'Karnataka',      district: 'Bengaluru Urban', type: 'engineering' },
  { name: 'Mysuru College of Engineering, Mysuru',             state: 'Karnataka',      district: 'Mysuru',         type: 'engineering' },
  { name: 'Hubli School of Pharmacy, Hubli',                   state: 'Karnataka',      district: 'Dharwad',        type: 'pharmacy' },
  { name: 'Mangaluru Institute of Management, Mangaluru',      state: 'Karnataka',      district: 'Dakshina Kannada', type: 'management' },

  // ---- Kerala ----
  { name: 'Rajiv Gandhi Institute of Technology, Kottayam',    state: 'Kerala',         district: 'Kottayam',       type: 'engineering' },
  { name: 'Kochi College of Engineering, Kochi',               state: 'Kerala',         district: 'Ernakulam',      type: 'engineering' },
  { name: 'Kozhikode School of Architecture, Kozhikode',       state: 'Kerala',         district: 'Kozhikode',      type: 'architecture' },

  // ---- Madhya Pradesh ----
  { name: 'Bhopal Institute of Technology, Bhopal',            state: 'Madhya Pradesh', district: 'Bhopal',         type: 'engineering' },
  { name: 'Gwalior Polytechnic, Gwalior',                      state: 'Madhya Pradesh', district: 'Gwalior',        type: 'polytechnic' },
  { name: 'Jabalpur College of Pharmacy, Jabalpur',            state: 'Madhya Pradesh', district: 'Jabalpur',       type: 'pharmacy' },

  // ---- Maharashtra ----
  { name: 'Mumbai Institute of Technology, Mumbai',            state: 'Maharashtra',    district: 'Mumbai',         type: 'engineering' },
  { name: 'Pune College of Engineering, Pune',                 state: 'Maharashtra',    district: 'Pune',           type: 'engineering' },
  { name: 'Nagpur School of Pharmacy, Nagpur',                 state: 'Maharashtra',    district: 'Nagpur',         type: 'pharmacy' },
  { name: 'Nashik Polytechnic, Nashik',                        state: 'Maharashtra',    district: 'Nashik',         type: 'polytechnic' },
  { name: 'Aurangabad Institute of Management, Aurangabad',    state: 'Maharashtra',    district: 'Aurangabad',     type: 'management' },

  // ---- Odisha ----
  { name: 'Bhubaneswar Institute of Technology, Bhubaneswar',  state: 'Odisha',         district: 'Khordha',        type: 'engineering' },
  { name: 'Cuttack College of Pharmacy, Cuttack',              state: 'Odisha',         district: 'Cuttack',        type: 'pharmacy' },

  // ---- Punjab ----
  { name: 'Chandigarh College of Engineering, Chandigarh',     state: 'Punjab',         district: 'S.A.S. Nagar',   type: 'engineering' },
  { name: 'Ludhiana Polytechnic, Ludhiana',                    state: 'Punjab',         district: 'Ludhiana',       type: 'polytechnic' },

  // ---- Rajasthan ----
  { name: 'Jaipur National Institute of Technology, Jaipur',   state: 'Rajasthan',      district: 'Jaipur',         type: 'engineering' },
  { name: 'Jodhpur School of Architecture, Jodhpur',           state: 'Rajasthan',      district: 'Jodhpur',        type: 'architecture' },
  { name: 'Kota Institute of Pharmacy, Kota',                  state: 'Rajasthan',      district: 'Kota',           type: 'pharmacy' },
  { name: 'Udaipur Management Institute, Udaipur',             state: 'Rajasthan',      district: 'Udaipur',        type: 'management' },

  // ---- Tamil Nadu ----
  { name: 'Chennai Institute of Technology, Chennai',          state: 'Tamil Nadu',     district: 'Chennai',        type: 'engineering' },
  { name: 'Madurai College of Engineering, Madurai',           state: 'Tamil Nadu',     district: 'Madurai',        type: 'engineering' },
  { name: 'Salem Polytechnic, Salem',                          state: 'Tamil Nadu',     district: 'Salem',          type: 'polytechnic' },
  { name: 'Tiruchirappalli Institute of Pharmacy, Tiruchirappalli', state: 'Tamil Nadu', district: 'Tiruchirappalli', type: 'pharmacy' },

  // ---- Telangana ----
  { name: 'Hyderabad Institute of Technology, Hyderabad',      state: 'Telangana',      district: 'Hyderabad',      type: 'engineering' },
  { name: 'Warangal College of Engineering, Warangal',         state: 'Telangana',      district: 'Warangal',       type: 'engineering' },
  { name: 'Nizamabad School of Pharmacy, Nizamabad',           state: 'Telangana',      district: 'Nizamabad',      type: 'pharmacy' },

  // ---- Uttar Pradesh (additional) ----
  { name: 'Noida Institute of Technology, Noida',              state: 'Uttar Pradesh',  district: 'Gautam Buddh Nagar', type: 'engineering' },
  { name: 'Agra College of Pharmacy, Agra',                    state: 'Uttar Pradesh',  district: 'Agra',           type: 'pharmacy' },
  { name: 'Varanasi Polytechnic, Varanasi',                    state: 'Uttar Pradesh',  district: 'Varanasi',       type: 'polytechnic' },
  { name: 'Allahabad Institute of Management, Allahabad',      state: 'Uttar Pradesh',  district: 'Allahabad',      type: 'management' },

  // ---- West Bengal ----
  { name: 'Kolkata Institute of Technology, Kolkata',          state: 'West Bengal',    district: 'Kolkata',        type: 'engineering' },
  { name: 'Howrah Engineering College, Howrah',                state: 'West Bengal',    district: 'Howrah',         type: 'engineering' },
  { name: 'Siliguri Polytechnic, Siliguri',                    state: 'West Bengal',    district: 'Darjeeling',     type: 'polytechnic' },
  { name: 'Durgapur College of Pharmacy, Durgapur',           state: 'West Bengal',    district: 'Paschim Bardhaman', type: 'pharmacy' },
];
// Total: 7 anomaly + 53 regular = 60 institutions

// =============================================================================
// § 6  Build Institutions
// =============================================================================

function getStateCode(stateName: string): number {
  const s = STATES.find(st => st.name === stateName);
  return s ? s.code : 99;
}

export const seedInstitutions: Institution[] = INSTITUTION_DEFS.map((def, idx) => {
  const stateCode = getStateCode(def.state);
  const aicteSeq = 1001 + idx;
  const name = generateIndianName();
  const email = generateEmail(def.name);
  const phone = generatePhone();
  const established = rng.nextInt(1962, 2015);

  return {
    id: `INST-${String(idx + 1).padStart(3, '0')}`,
    name: def.name,
    aicteId: `${stateCode}-47-${String(aicteSeq).padStart(4, '0')}`,
    state: def.state,
    district: def.district,
    type: def.type,
    established,
    nodalOfficer: name,
    email,
    phone,
    riskScore: 0,
    fdrCount: 0,
  };
});

// Build a lookup map
const instById = new Map(seedInstitutions.map(i => [i.id, i]));

// =============================================================================
// § 7  Bank Branches (~30)
// =============================================================================

interface BankDef {
  name: string;
  code: string; // 4-letter IFSC prefix
}

const BANKS: BankDef[] = [
  { name: 'Bharatiya State Bank',      code: 'BSBI' },
  { name: 'National Commerce Bank',    code: 'NCBK' },
  { name: 'United Industrial Bank',    code: 'UIBK' },
  { name: "People's Cooperative Bank", code: 'PCBK' },
  { name: 'Central Bank of Bharat',    code: 'CBBK' },
  { name: 'Eastern Rural Bank',        code: 'ERBK' },
  { name: 'Western Development Bank',  code: 'WDBK' },
  { name: 'Southern Federal Bank',     code: 'SFBK' },
  { name: 'Northern Trust Bank',       code: 'NTBK' },
  { name: 'Deccan Gramin Bank',        code: 'DGBK' },
];

const BRANCH_CITIES = [
  { city: 'New Delhi',           state: 'Delhi' },
  { city: 'Mumbai',              state: 'Maharashtra' },
  { city: 'Bengaluru',           state: 'Karnataka' },
  { city: 'Chennai',             state: 'Tamil Nadu' },
  { city: 'Kolkata',             state: 'West Bengal' },
  { city: 'Hyderabad',           state: 'Telangana' },
  { city: 'Pune',                state: 'Maharashtra' },
  { city: 'Ahmedabad',           state: 'Gujarat' },
  { city: 'Jaipur',              state: 'Rajasthan' },
  { city: 'Lucknow',             state: 'Uttar Pradesh' },
  { city: 'Kanpur',              state: 'Uttar Pradesh' },
  { city: 'Bhopal',              state: 'Madhya Pradesh' },
  { city: 'Indore',              state: 'Madhya Pradesh' },
  { city: 'Patna',               state: 'Bihar' },
  { city: 'Raipur',              state: 'Chhattisgarh' },
  { city: 'Kochi',               state: 'Kerala' },
  { city: 'Coimbatore',          state: 'Tamil Nadu' },
  { city: 'Visakhapatnam',       state: 'Andhra Pradesh' },
  { city: 'Bhubaneswar',         state: 'Odisha' },
  { city: 'Chandigarh',          state: 'Punjab' },
  { city: 'Ranchi',              state: 'Jharkhand' },
  { city: 'Gwalior',             state: 'Madhya Pradesh' },
  { city: 'Nagpur',              state: 'Maharashtra' },
  { city: 'Surat',               state: 'Gujarat' },
  { city: 'Varanasi',            state: 'Uttar Pradesh' },
  { city: 'Madurai',             state: 'Tamil Nadu' },
  { city: 'Mysuru',              state: 'Karnataka' },
  { city: 'Jodhpur',             state: 'Rajasthan' },
  { city: 'Vijayawada',          state: 'Andhra Pradesh' },
  { city: 'Thiruvananthapuram',  state: 'Kerala' },
];

export const seedBankBranches: BankBranch[] = BRANCH_CITIES.map((loc, idx) => {
  const bank = BANKS[idx % BANKS.length];
  const branchCode = String(100001 + idx * 137).padStart(6, '0');
  return {
    id: `BR-${String(idx + 1).padStart(3, '0')}`,
    bankName: bank.name,
    branchName: `${loc.city} Main Branch`,
    ifscCode: `${bank.code}0${branchCode}`,
    city: loc.city,
    state: loc.state,
  };
});

// =============================================================================
// § 8  FDR Amount Ranges by Institution Type (in rupees)
// =============================================================================

const AMOUNT_RANGES: Record<InstitutionType, [number, number]> = {
  engineering:   [50_00_000,   5_00_00_000],   // ₹50L – ₹5Cr
  pharmacy:      [25_00_000,   2_00_00_000],   // ₹25L – ₹2Cr
  management:    [25_00_000,   3_00_00_000],   // ₹25L – ₹3Cr
  polytechnic:   [10_00_000,   1_00_00_000],   // ₹10L – ₹1Cr
  architecture:  [15_00_000,   2_00_00_000],   // ₹15L – ₹2Cr
};

// =============================================================================
// § 9  FDR Status Distribution & Trust Tier Mapping
// =============================================================================

const STATUS_WEIGHTS: { status: FDRStatus; weight: number }[] = [
  { status: 'active',           weight: 40 },
  { status: 'verified',         weight: 15 },
  { status: 'expiring',         weight: 10 },
  { status: 'submitted',        weight: 5 },
  { status: 'under_scrutiny',   weight: 5 },
  { status: 'matured',          weight: 5 },
  { status: 'renewal_pending',  weight: 3 },
  { status: 'renewed',          weight: 2 },
  { status: 'release_requested', weight: 2 },
  { status: 'released',         weight: 3 },
  { status: 'discrepancy',      weight: 5 },
  { status: 'rejected',         weight: 5 },
];

const TOTAL_STATUS_WEIGHT = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);

function pickStatus(): FDRStatus {
  const roll = rng.nextInt(1, TOTAL_STATUS_WEIGHT);
  let cumulative = 0;
  for (const sw of STATUS_WEIGHTS) {
    cumulative += sw.weight;
    if (roll <= cumulative) return sw.status;
  }
  return 'active';
}

function statusToTrustTier(status: FDRStatus): TrustTier {
  switch (status) {
    case 'submitted':           return 'submitted';
    case 'under_scrutiny':      return 'system_validated';
    case 'verified':            return 'officer_verified';
    case 'active':              return 'bank_confirmed';
    case 'expiring':            return 'bank_confirmed';
    case 'matured':             return 'bank_confirmed';
    case 'renewal_pending':     return 'bank_confirmed';
    case 'renewed':             return 'bank_confirmed';
    case 'release_requested':   return 'officer_verified';
    case 'released':            return 'bank_confirmed';
    case 'discrepancy':         return 'system_validated';
    case 'rejected':            return 'submitted';
    default:                    return 'submitted';
  }
}

// =============================================================================
// § 10  Interest Rates
// =============================================================================

const INTEREST_RATES = [5.5, 6.0, 6.25, 6.5, 6.75, 7.0, 7.1, 7.25, 7.5, 7.75, 8.0];

// =============================================================================
// § 11  Date Helpers
// =============================================================================

function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function randomIssueDate(): string {
  // 2023-01-01 to 2026-06-30
  const start = new Date(2023, 0, 1).getTime();
  const end = new Date(2026, 5, 30).getTime();
  const t = start + Math.floor(rng.next() * (end - start));
  return dateToStr(new Date(t));
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return dateToStr(d);
}

function isoTimestamp(dateStr: string, hoursOffset = 0): string {
  const d = new Date(dateStr);
  d.setHours(rng.nextInt(8, 18), rng.nextInt(0, 59), rng.nextInt(0, 59));
  d.setTime(d.getTime() + hoursOffset * 3600_000);
  return d.toISOString();
}

// =============================================================================
// § 12  Generate ~400 FDRs
// =============================================================================

/** Distribution: how many FDRs each institution gets. */
function computeFdrCounts(numInstitutions: number, totalFdrs: number): number[] {
  const counts: number[] = [];
  let remaining = totalFdrs;

  for (let i = 0; i < numInstitutions; i++) {
    if (i === numInstitutions - 1) {
      counts.push(remaining);
    } else {
      // Each institution gets 3–10 FDRs, biased toward 6-7
      const max = Math.min(10, remaining - (numInstitutions - i - 1) * 3);
      const min = Math.max(3, remaining - (numInstitutions - i - 1) * 10);
      const count = rng.nextInt(Math.max(3, min), Math.min(10, max));
      counts.push(count);
      remaining -= count;
    }
  }
  return counts;
}

// FDR number sequence counters per bank code per year
const fdrSeqCounters = new Map<string, number>();

function nextFdrNumber(bankCode: string, year: number): string {
  const key = `${bankCode}/${year}`;
  const seq = (fdrSeqCounters.get(key) ?? 0) + 1;
  fdrSeqCounters.set(key, seq);
  return `${bankCode}/FD/${year}/${String(seq).padStart(5, '0')}`;
}

// Pre-compute how many FDRs each institution gets
const fdrDistribution = computeFdrCounts(seedInstitutions.length, 400);

const allFdrs: FDR[] = [];
let globalFdrIdx = 0;

// Anomaly-specific FDR IDs (we'll fill these in)
let anomalyDuplicateFdr1Id = '';
let anomalyDuplicateFdr2Id = '';
let anomalyTamperedFdrId = '';
let anomalyDateFdrId = '';
let anomalyLienFdrId = '';
let anomalyHash1FdrId = '';
let anomalyHash2FdrId = '';

// The shared hash for anomaly 5
const SHARED_DOCUMENT_HASH = 'a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1';

for (let instIdx = 0; instIdx < seedInstitutions.length; instIdx++) {
  const inst = seedInstitutions[instIdx];
  const count = fdrDistribution[instIdx];

  for (let f = 0; f < count; f++) {
    globalFdrIdx++;
    const fdrId = `FDR-${String(globalFdrIdx).padStart(4, '0')}`;
    const branch = rng.pick(seedBankBranches);
    const bankCode = branch.ifscCode.substring(0, 4);

    const issueDate = randomIssueDate();
    const tenureYears = rng.pick([1, 1, 2, 2, 3]);
    const maturityDate = addYears(issueDate, tenureYears);

    const [minAmt, maxAmt] = AMOUNT_RANGES[inst.type];
    // Round to nearest lakh (100000)
    const amountRupees = Math.round(rng.nextInt(minAmt, maxAmt) / 100000) * 100000;
    const amountPaise = amountRupees * 100;

    const status = pickStatus();
    const trustTier = statusToTrustTier(status);
    const interestRate = rng.pick(INTEREST_RATES);
    const lienMarked = rng.next() < 0.9; // 90% have lien
    const renewalCount = rng.next() < 0.15 ? rng.nextInt(1, 2) : 0;
    const docHash = rng.hexString(32); // 64 hex chars = 32 bytes

    const issueYear = parseInt(issueDate.substring(0, 4));
    const fdrNumber = nextFdrNumber(bankCode, issueYear);

    const createdAt = isoTimestamp(issueDate);
    const updatedAt = isoTimestamp(issueDate, rng.nextInt(1, 720)); // 1–720 hours later

    const fdr: FDR = {
      id: fdrId,
      fdrNumber,
      institutionId: inst.id,
      bankName: branch.bankName,
      branchName: branch.branchName,
      ifscCode: branch.ifscCode,
      amount: amountPaise,
      issueDate,
      maturityDate,
      status,
      trustTier,
      lienMarked,
      documentHash: docHash,
      renewalCount,
      previousFdrId: null,
      createdAt,
      updatedAt,
      notes: '',
      interestRate,
    };

    allFdrs.push(fdr);
  }
}

// =============================================================================
// § 13  Plant Anomalies
// =============================================================================

// Helper: find FDRs belonging to an institution
function fdrsForInst(instId: string): FDR[] {
  return allFdrs.filter(f => f.institutionId === instId);
}

// ---------- ANOMALY 1: Duplicate FDR Number ----------
// "Raipur Institute of Technology" (INST-001) and "Bhilai Engineering College" (INST-002)
// both get FDR# SBI/FD/2024/00847
{
  const raipurFdrs = fdrsForInst('INST-001');
  const bhilaiFdrs = fdrsForInst('INST-002');

  if (raipurFdrs.length > 0 && bhilaiFdrs.length > 0) {
    const fdr1 = raipurFdrs[0];
    const fdr2 = bhilaiFdrs[0];

    // Overwrite both FDR numbers to the duplicate value
    (fdr1 as any).fdrNumber = 'BSBI/FD/2024/00847';
    (fdr1 as any).issueDate = '2024-03-15';
    (fdr1 as any).maturityDate = '2026-03-15';
    (fdr1 as any).amount = 1_00_00_000 * 100; // ₹1Cr in paise
    (fdr1 as any).status = 'active';
    (fdr1 as any).trustTier = 'bank_confirmed';
    (fdr1 as any).lienMarked = true;

    (fdr2 as any).fdrNumber = 'BSBI/FD/2024/00847';
    (fdr2 as any).issueDate = '2024-06-20';
    (fdr2 as any).maturityDate = '2026-06-20';
    (fdr2 as any).amount = 75_00_000 * 100; // ₹75L in paise
    (fdr2 as any).status = 'active';
    (fdr2 as any).trustTier = 'bank_confirmed';
    (fdr2 as any).lienMarked = true;

    anomalyDuplicateFdr1Id = fdr1.id;
    anomalyDuplicateFdr2Id = fdr2.id;
  }
}

// ---------- ANOMALY 2: Tampered Amount ----------
// "Indore School of Architecture" (INST-003) has amount/bankReportedAmount mismatch
{
  const indoreFdrs = fdrsForInst('INST-003');
  if (indoreFdrs.length > 0) {
    const fdr = indoreFdrs[0];
    (fdr as any).amount = 25_00_000 * 100;             // ₹25,00,000 in paise
    (fdr as any).bankReportedAmount = 15_00_000 * 100;  // ₹15,00,000 in paise — MISMATCH
    (fdr as any).status = 'active';
    (fdr as any).trustTier = 'bank_confirmed';
    (fdr as any).lienMarked = true;
    anomalyTamperedFdrId = fdr.id;
  }
}

// ---------- ANOMALY 3: Maturity Before Issue ----------
// "Patna Polytechnic" (INST-004) — impossible date ordering
{
  const patnaFdrs = fdrsForInst('INST-004');
  if (patnaFdrs.length > 0) {
    const fdr = patnaFdrs[0];
    (fdr as any).issueDate = '2025-03-15';
    (fdr as any).maturityDate = '2024-09-10'; // BEFORE issue date!
    (fdr as any).status = 'active';
    (fdr as any).trustTier = 'bank_confirmed';
    (fdr as any).lienMarked = true;
    anomalyDateFdrId = fdr.id;
  }
}

// ---------- ANOMALY 4: Missing Lien ----------
// "Coimbatore Institute of Management" (INST-005) — lienMarked = false
{
  const coimFdrs = fdrsForInst('INST-005');
  if (coimFdrs.length > 0) {
    const fdr = coimFdrs[0];
    (fdr as any).lienMarked = false;
    (fdr as any).status = 'active';
    (fdr as any).trustTier = 'bank_confirmed';
    anomalyLienFdrId = fdr.id;
  }
}

// ---------- ANOMALY 5: Reused Document Hash ----------
// "Lucknow College of Engineering" (INST-006) and "Kanpur Technical Institute" (INST-007)
{
  const lucknowFdrs = fdrsForInst('INST-006');
  const kanpurFdrs = fdrsForInst('INST-007');

  if (lucknowFdrs.length > 0 && kanpurFdrs.length > 0) {
    const fdr1 = lucknowFdrs[0];
    const fdr2 = kanpurFdrs[0];

    (fdr1 as any).documentHash = SHARED_DOCUMENT_HASH;
    (fdr1 as any).status = 'active';
    (fdr1 as any).trustTier = 'bank_confirmed';
    (fdr1 as any).lienMarked = true;

    (fdr2 as any).documentHash = SHARED_DOCUMENT_HASH;
    (fdr2 as any).status = 'active';
    (fdr2 as any).trustTier = 'bank_confirmed';
    (fdr2 as any).lienMarked = true;

    anomalyHash1FdrId = fdr1.id;
    anomalyHash2FdrId = fdr2.id;
  }
}

export const seedFDRs: FDR[] = allFdrs;

// Update institution fdrCounts
for (const fdr of seedFDRs) {
  const inst = instById.get(fdr.institutionId);
  if (inst) {
    (inst as any).fdrCount = (inst.fdrCount ?? 0) + 1;
  }
}

// =============================================================================
// § 14  Audit Log (~50 entries, hash-chained)
// =============================================================================

const AUDIT_ACTIONS: { action: string; actorRole: UserRole; detailTemplate: string }[] = [
  { action: 'fdr_submitted',          actorRole: 'institution',       detailTemplate: 'FDR {fdrNumber} submitted for verification' },
  { action: 'scrutiny_assigned',      actorRole: 'admin',             detailTemplate: 'Scrutiny assigned to officer for FDR {fdrNumber}' },
  { action: 'scrutiny_completed',     actorRole: 'scrutiny_officer',  detailTemplate: 'Scrutiny completed for FDR {fdrNumber}. All checks passed.' },
  { action: 'verification_requested', actorRole: 'scrutiny_officer',  detailTemplate: 'Bank verification requested for FDR {fdrNumber}' },
  { action: 'bank_confirmed',         actorRole: 'bank_verifier',     detailTemplate: 'Bank confirmed authenticity of FDR {fdrNumber}' },
  { action: 'bank_rejected',          actorRole: 'bank_verifier',     detailTemplate: 'Bank rejected FDR {fdrNumber}: document mismatch' },
  { action: 'fdr_approved',           actorRole: 'regional_officer',  detailTemplate: 'FDR {fdrNumber} approved and marked active' },
  { action: 'fdr_rejected',           actorRole: 'regional_officer',  detailTemplate: 'FDR {fdrNumber} rejected due to compliance failure' },
  { action: 'lien_marked',            actorRole: 'bank_verifier',     detailTemplate: 'Lien marked on FDR {fdrNumber} in favour of AICTE' },
  { action: 'lien_released',          actorRole: 'authority',         detailTemplate: 'Lien released on FDR {fdrNumber}' },
  { action: 'renewal_initiated',      actorRole: 'institution',       detailTemplate: 'Renewal initiated for FDR {fdrNumber}' },
  { action: 'renewal_completed',      actorRole: 'bank_verifier',     detailTemplate: 'Renewal completed for FDR {fdrNumber}. New maturity set.' },
  { action: 'document_uploaded',      actorRole: 'institution',       detailTemplate: 'Document uploaded for FDR {fdrNumber}' },
  { action: 'alert_raised',           actorRole: 'admin',             detailTemplate: 'Alert raised for FDR {fdrNumber}: expiry approaching' },
  { action: 'amount_updated',         actorRole: 'scrutiny_officer',  detailTemplate: 'Amount corrected for FDR {fdrNumber}' },
];

// Realistic actor names
const ACTORS: { id: string; role: UserRole; name: string }[] = [
  { id: 'USR-SO-001', role: 'scrutiny_officer',  name: 'Arjun Mehta' },
  { id: 'USR-SO-002', role: 'scrutiny_officer',  name: 'Priyanka Desai' },
  { id: 'USR-RO-001', role: 'regional_officer',  name: 'Vijay Krishnamurthy' },
  { id: 'USR-RO-002', role: 'regional_officer',  name: 'Ananya Bhat' },
  { id: 'USR-BV-001', role: 'bank_verifier',     name: 'Ramesh Agarwal' },
  { id: 'USR-BV-002', role: 'bank_verifier',     name: 'Sunita Kapoor' },
  { id: 'USR-AU-001', role: 'authority',          name: 'Dr. Rajendra Prasad Tripathi' },
  { id: 'USR-AD-001', role: 'admin',              name: 'System Administrator' },
];

function sha256Sync(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] ?? 0) | (j << (((3 - i) % 4) * 8));
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = [...hash];
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const a = hash[0] ?? 0;
      const e = hash[4] ?? 0;
      const rrot = (val: number, amt: number) => (val >>> amt) | (val << (32 - amt));
      const s1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25);
      const ch = (e & (hash[5] ?? 0)) ^ (~e & (hash[6] ?? 0));
      const wi = i < 16
        ? (w[i] ?? 0)
        : (((w[i - 16] ?? 0) +
            (rrot(w15, 7) ^ rrot(w15, 18) ^ (w15 >>> 3)) +
            (w[i - 7] ?? 0) +
            (rrot(w2, 17) ^ rrot(w2, 19) ^ (w2 >>> 10))) | 0);
      w[i] = wi;
      const temp1 = ((hash[7] ?? 0) + s1 + ch + (k[i] ?? 0) + wi) | 0;
      const s0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22);
      const maj = (a & (hash[1] ?? 0)) ^ (a & (hash[2] ?? 0)) ^ ((hash[1] ?? 0) & (hash[2] ?? 0));
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6] ?? 0;
      hash[6] = hash[5] ?? 0;
      hash[5] = hash[4] ?? 0;
      hash[4] = ((hash[3] ?? 0) + temp1) | 0;
      hash[3] = hash[2] ?? 0;
      hash[2] = hash[1] ?? 0;
      hash[1] = hash[0] ?? 0;
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = ((hash[i] ?? 0) + (oldHash[i] ?? 0)) | 0;
    }
  }
  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = ((hash[i] ?? 0) >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

function computeEntryHash(
  prevHash: string,
  timestamp: string,
  action: string,
  actorId: string,
  entityId: string,
  details: string,
): string {
  const preImage = buildPreImage(prevHash, timestamp, action, actorId, entityId, details);
  return sha256Sync(preImage);
}

// Generate audit entries
const auditEntries: AuditLogEntry[] = [];

// Start date for audit log
let auditDate = new Date('2024-01-15T09:00:00Z');
let prevHash = GENESIS_PREV_HASH; // genesis

// We'll pick random FDRs and actions
const activeFdrs = seedFDRs.filter(f => ['active', 'verified', 'expiring', 'matured', 'renewed', 'released'].includes(f.status));

for (let i = 0; i < 50; i++) {
  const auditId = `AUD-${String(i + 1).padStart(4, '0')}`;

  // Advance time by 1–14 days
  auditDate = new Date(auditDate.getTime() + rng.nextInt(1, 14) * 86400_000 + rng.nextInt(0, 28800_000));
  const timestamp = auditDate.toISOString();

  // Pick a random action template
  const actionDef = rng.pick(AUDIT_ACTIONS);

  // Pick a random FDR
  const fdr = rng.pick(activeFdrs.length > 0 ? activeFdrs : seedFDRs);

  // Pick an appropriate actor
  const matchingActors = ACTORS.filter(a => a.role === actionDef.actorRole);
  const actor = matchingActors.length > 0 ? rng.pick(matchingActors) : rng.pick(ACTORS);

  // For institution actions, use the institution's own id
  const actorId = actionDef.actorRole === 'institution' ? fdr.institutionId : actor.id;
  const actorRole = actionDef.actorRole;

  const details = actionDef.detailTemplate.replace('{fdrNumber}', fdr.fdrNumber);

  const hash = computeEntryHash(
    prevHash,
    timestamp,
    actionDef.action,
    actorId,
    fdr.id,
    details,
  );

  const entry: AuditLogEntry = {
    id: auditId,
    timestamp,
    action: actionDef.action,
    actorId,
    actorRole,
    entityType: 'fdr',
    entityId: fdr.id,
    details,
    previousHash: prevHash,
    hash,
  };

  auditEntries.push(entry);
  prevHash = hash;
}

// ---------- PLANT TAMPERED AUDIT ENTRY ----------
// Modify entry #25's details AFTER hash was computed, breaking the chain
if (auditEntries.length > 25) {
  const tamperedEntry = auditEntries[25];
  // Mutate the details field — the hash was computed with the ORIGINAL details,
  // so hash verification will now fail for this entry.
  (tamperedEntry as any).details = tamperedEntry.details.replace(
    /FDR [A-Z]{4}\/FD\/\d{4}\/\d{5}/,
    'FDR BSBI/FD/2024/99999'
  );
}

export const seedAuditLog: AuditLogEntry[] = auditEntries;

// =============================================================================
// § 15  Alerts (computed from seed FDRs and reference date)
// =============================================================================

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  return Math.round((d2 - d1) / 86400_000);
}

const EXPIRY_THRESHOLDS: { type: AlertType; days: number; severity: string }[] = [
  { type: 'expiry_7',  days: 7,  severity: 'critical' },
  { type: 'expiry_15', days: 15, severity: 'critical' },
  { type: 'expiry_30', days: 30, severity: 'high' },
  { type: 'expiry_60', days: 60, severity: 'medium' },
  { type: 'expiry_90', days: 90, severity: 'low' },
];

const seedAlertsList: Alert[] = [];
let alertIdx = 0;

// Generate expiry alerts for FDRs maturing within 90 days of reference date
for (const fdr of seedFDRs) {
  if (!['active', 'expiring', 'verified'].includes(fdr.status)) continue;

  const daysToMaturity = daysBetween(REFERENCE_DATE, fdr.maturityDate);
  if (daysToMaturity < 0 || daysToMaturity > 90) continue;

  // Find the most critical threshold that applies
  for (const threshold of EXPIRY_THRESHOLDS) {
    if (daysToMaturity <= threshold.days) {
      alertIdx++;
      const inst = instById.get(fdr.institutionId);
      seedAlertsList.push({
        id: `ALT-${String(alertIdx).padStart(4, '0')}`,
        fdrId: fdr.id,
        institutionId: fdr.institutionId,
        type: threshold.type,
        severity: threshold.severity,
        message: `FDR ${fdr.fdrNumber} for ${inst?.name ?? 'Unknown'} matures in ${daysToMaturity} days (${fdr.maturityDate}). Immediate action required.`,
        recipients: [fdr.institutionId, 'USR-RO-001', 'USR-AU-001'],
        channels: daysToMaturity <= 15 ? ['email', 'sms', 'dashboard'] : ['email', 'dashboard'],
        createdAt: new Date(REFERENCE_DATE).toISOString(),
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
      });
      break; // only the most critical threshold per FDR
    }
  }
}

// Add anomaly-specific alerts
alertIdx++;
seedAlertsList.push({
  id: `ALT-${String(alertIdx).padStart(4, '0')}`,
  fdrId: anomalyDuplicateFdr1Id,
  institutionId: 'INST-001',
  type: 'expiry_90',
  severity: 'critical',
  message: `DUPLICATE FDR NUMBER DETECTED: FDR number BSBI/FD/2024/00847 is used by both Raipur Institute of Technology and Bhilai Engineering College. Possible fraud.`,
  recipients: ['INST-001', 'INST-002', 'USR-RO-001', 'USR-AU-001'],
  channels: ['email', 'sms', 'dashboard'],
  createdAt: new Date(REFERENCE_DATE).toISOString(),
  acknowledged: false,
  acknowledgedBy: null,
  acknowledgedAt: null,
});

alertIdx++;
seedAlertsList.push({
  id: `ALT-${String(alertIdx).padStart(4, '0')}`,
  fdrId: anomalyTamperedFdrId,
  institutionId: 'INST-003',
  type: 'expiry_90',
  severity: 'critical',
  message: `AMOUNT MISMATCH: FDR for Indore School of Architecture shows ₹25,00,000 but bank reports ₹15,00,000. Discrepancy of ₹10,00,000.`,
  recipients: ['INST-003', 'USR-SO-001', 'USR-RO-001', 'USR-AU-001'],
  channels: ['email', 'sms', 'dashboard'],
  createdAt: new Date(REFERENCE_DATE).toISOString(),
  acknowledged: false,
  acknowledgedBy: null,
  acknowledgedAt: null,
});

alertIdx++;
seedAlertsList.push({
  id: `ALT-${String(alertIdx).padStart(4, '0')}`,
  fdrId: anomalyDateFdrId,
  institutionId: 'INST-004',
  type: 'expiry_90',
  severity: 'critical',
  message: `DATE ANOMALY: FDR for Patna Polytechnic has maturity date (2024-09-10) BEFORE issue date (2025-03-15). Invalid FDR.`,
  recipients: ['INST-004', 'USR-SO-001', 'USR-RO-001', 'USR-AU-001'],
  channels: ['email', 'sms', 'dashboard'],
  createdAt: new Date(REFERENCE_DATE).toISOString(),
  acknowledged: false,
  acknowledgedBy: null,
  acknowledgedAt: null,
});

alertIdx++;
seedAlertsList.push({
  id: `ALT-${String(alertIdx).padStart(4, '0')}`,
  fdrId: anomalyLienFdrId,
  institutionId: 'INST-005',
  type: 'expiry_90',
  severity: 'high',
  message: `MISSING LIEN: FDR for Coimbatore Institute of Management is active but lien is NOT marked in favour of AICTE.`,
  recipients: ['INST-005', 'USR-BV-001', 'USR-RO-001'],
  channels: ['email', 'dashboard'],
  createdAt: new Date(REFERENCE_DATE).toISOString(),
  acknowledged: false,
  acknowledgedBy: null,
  acknowledgedAt: null,
});

alertIdx++;
seedAlertsList.push({
  id: `ALT-${String(alertIdx).padStart(4, '0')}`,
  fdrId: anomalyHash1FdrId,
  institutionId: 'INST-006',
  type: 'expiry_90',
  severity: 'critical',
  message: `DOCUMENT HASH COLLISION: FDRs from Lucknow College of Engineering and Kanpur Technical Institute share identical document hash. Possible forged document.`,
  recipients: ['INST-006', 'INST-007', 'USR-SO-001', 'USR-RO-001', 'USR-AU-001'],
  channels: ['email', 'sms', 'dashboard'],
  createdAt: new Date(REFERENCE_DATE).toISOString(),
  acknowledged: false,
  acknowledgedBy: null,
  acknowledgedAt: null,
});

export const seedAlerts: Alert[] = seedAlertsList;

// =============================================================================
// § 16  Summary & Verification Constants
// =============================================================================

/** Anomaly FDR IDs for use by detection engines. */
export const ANOMALY_IDS = {
  duplicateFdrNumber: {
    fdr1: anomalyDuplicateFdr1Id,
    fdr2: anomalyDuplicateFdr2Id,
    fdrNumber: 'BSBI/FD/2024/00847',
  },
  tamperedAmount: {
    fdrId: anomalyTamperedFdrId,
    claimedAmountPaise: 25_00_000 * 100,
    bankReportedAmountPaise: 15_00_000 * 100,
  },
  maturityBeforeIssue: {
    fdrId: anomalyDateFdrId,
    issueDate: '2025-03-15',
    maturityDate: '2024-09-10',
  },
  missingLien: {
    fdrId: anomalyLienFdrId,
  },
  reusedDocumentHash: {
    fdr1: anomalyHash1FdrId,
    fdr2: anomalyHash2FdrId,
    hash: SHARED_DOCUMENT_HASH,
  },
  tamperedAuditEntry: {
    entryIndex: 25,
  },
} as const;
