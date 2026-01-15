export interface Bank {
    id: string;
    name: string;
    color: string; // Used for UI placeholder if logo is missing
    domain?: string; // Used to fetch logo
}

export const MALAYSIAN_BANKS: Bank[] = [
    // Major Commercial
    { id: 'maybank', name: 'Maybank', color: '#FFBC00', domain: 'maybank2u.com.my' },
    { id: 'cimb', name: 'CIMB Bank', color: '#ED1C24', domain: 'cimbclicks.com.my' },
    { id: 'public-bank', name: 'Public Bank', color: '#DA251C', domain: 'pbebank.com' },
    { id: 'rhb', name: 'RHB Bank', color: '#005DAA', domain: 'rhbgroup.com' },
    { id: 'hong-leong', name: 'Hong Leong Bank', color: '#003D7C', domain: 'hlb.com.my' },
    { id: 'ambank', name: 'AmBank', color: '#ED1C24', domain: 'ambank.com.my' },
    { id: 'alliance', name: 'Alliance Bank', color: '#005596', domain: 'alliancebank.com.my' },
    { id: 'affin', name: 'Affin Bank', color: '#004A99', domain: 'affinalways.com' },

    // Islamic
    { id: 'bank-islam', name: 'Bank Islam', color: '#911B1E', domain: 'bankislam.com' },
    { id: 'bank-muamalat', name: 'Bank Muamalat', color: '#8C1D18', domain: 'muamalat.com.my' },
    { id: 'bank-rakyat', name: 'Bank Rakyat', color: '#0054A6', domain: 'bankrakyat.com.my' },
    { id: 'bsn', name: 'Bank Simpanan Nasional (BSN)', color: '#00549F', domain: 'bsn.com.my' },

    // Digital
    { id: 'gxbank', name: 'GXBank', color: '#6366F1', domain: 'gxbank.my' },
    { id: 'boost-bank', name: 'Boost Bank', color: '#F43F5E', domain: 'myboostbank.co' },
    { id: 'aeon-bank', name: 'AEON Bank', color: '#9B2C77', domain: 'aeonbank.com.my' },

    // Others
    { id: 'agrobank', name: 'Agrobank', color: '#018041', domain: 'agrobank.com.my' },
    { id: 'uob', name: 'UOB Malaysia', color: '#003366', domain: 'uob.com.my' },
    { id: 'ocbc', name: 'OCBC Bank', color: '#ED1C24', domain: 'ocbc.com.my' },
    { id: 'hsbc', name: 'HSBC Malaysia', color: '#DB0011', domain: 'hsbc.com.my' },
    { id: 'standard-chartered', name: 'Standard Chartered', color: '#005DAA', domain: 'sc.com/my' },
];
