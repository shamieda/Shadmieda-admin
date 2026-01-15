// TypeScript interfaces for Settings Page

export interface TaskTemplate {
    id: string;
    position: string;
    title: string;
    description: string;
    deadline_time?: string;
    penalty_amount: number;
    created_at: string;
}

export interface BonusConfig {
    id: string;
    name: string;
    value: number;
    requirement_type: string;
    requirement_value: string;
    created_at: string;
}

export interface Position {
    id: string;
    name: string;
    description?: string;
    created_at?: string;
}

export interface OnboardingItem {
    id: string;
    name: string;
    price: number;
    created_at?: string;
}

export interface ShopSettings {
    shop_name: string;
    address: string;
    latitude: string;
    longitude: string;
    radius: string;
    attendance_bonus: string;
    advanceLimit: string;
    startTime: string;
    endTime: string;
    penalty15m: string;
    penalty30m: string;
    penaltyMax: string;
    task_penalty_amount: string;
    ranking_reward_1: string;
    ranking_reward_2: string;
    ranking_reward_3: string;
}

// Initial state constants
export const INITIAL_SHOP_SETTINGS: ShopSettings = {
    shop_name: "",
    address: "",
    latitude: "3.1412",
    longitude: "101.6865",
    radius: "50",
    attendance_bonus: "0.00",
    advanceLimit: "500.00",
    startTime: "09:00",
    endTime: "18:00",
    penalty15m: "0.00",
    penalty30m: "0.00",
    penaltyMax: "0.00",
    task_penalty_amount: "2.00",
    ranking_reward_1: "100.00",
    ranking_reward_2: "50.00",
    ranking_reward_3: "25.00"
};

export const INITIAL_TEMPLATE = {
    position: "staff",
    title: "",
    description: "",
    deadline_time: "",
    penalty_amount: "0.00"
};

export const INITIAL_BONUS = {
    name: "",
    value: "0.00",
    requirement_type: "attendance",
    requirement_value: "26"
};

export const INITIAL_POSITION = {
    name: "",
    description: ""
};

export const INITIAL_ITEM = {
    name: "",
    price: ""
};
