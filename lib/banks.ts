export interface Bank {
    id: string;
    name: string;
    color: string; // Used for UI placeholder if logo is missing
}

export const MALAYSIAN_BANKS: Bank[] = [
    // Major Commercial
    { id: 'maybank', name: 'Maybank', color: '#FFBC00' },
    { id: 'cimb', name: 'CIMB Bank', color: '#ED1C24' },
    { id: 'public-bank', name: 'Public Bank', color: '#DA251C' },
    { id: 'rhb', name: 'RHB Bank', color: '#005DAA' },
    { id: 'hong-leong', name: 'Hong Leong Bank', color: '#003D7C' },
    { id: 'ambank', name: 'AmBank', color: '#ED1C24' },
    { id: 'alliance', name: 'Alliance Bank', color: '#005596' },
    { id: 'affin', name: 'Affin Bank', color: '#004A99' },

    // Islamic
    { id: 'bank-islam', name: 'Bank Islam', color: '#911B1E' },
    { id: 'bank-muamalat', name: 'Bank Muamalat', color: '#8C1D18' },
    { id: 'bank-rakyat', name: 'Bank Rakyat', color: '#0054A6' },
    { id: 'bsn', name: 'Bank Simpanan Nasional (BSN)', color: '#00549F' },

    // Digital
    { id: 'gxbank', name: 'GXBank', color: '#6366F1' },
    { id: 'boost-bank', name: 'Boost Bank', color: '#F43F5E' },
    { id: 'aeon-bank', name: 'AEON Bank', color: '#9B2C77' },

    // Others
    { id: 'agrobank', name: 'Agrobank', color: '#018041' },
    { id: 'uob', name: 'UOB Malaysia', color: '#003366' },
    { id: 'ocbc', name: 'OCBC Bank', color: '#ED1C24' },
    { id: 'hsbc', name: 'HSBC Malaysia', color: '#DB0011' },
    { id: 'standard-chartered', name: 'Standard Chartered', color: '#005DAA' },
];
