// Source of truth: data/mock/customers.csv + features.csv + events.csv
// DO NOT manually alter — sync from CSV only.

export interface MockCustomer {
  customer_id: string;
  name: string;
  initials: string;
  age: number;
  city: string;
  income: number;
  savings: number;
  debt: number;
  risk_profile: string;
  marital_status: string;
  dependents_count: number;
  homeowner_status: string;
  existing_products: string[];
  segment: 'Premium' | 'Standard' | 'Other';
  financial_health: string;
  match_score: number;
  events: { event_type: string; date: string }[];
  monthly_savings: number;
  avg_expenses: number;
  balance_trend: string;
  dominant_spend_category: string;
  savings_rate: number;
}

export const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    "customer_id": "1",
    "name": "Andrei Popescu",
    "initials": "AP",
    "age": 30,
    "city": "Cluj",
    "income": 4824,
    "savings": 2639,
    "debt": 24299,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card"
    ],
    "segment": "Standard",
    "financial_health": "at-risk",
    "match_score": 50,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-01-28"
      }
    ],
    "monthly_savings": 348.0,
    "avg_expenses": 15732.0,
    "balance_trend": "growing",
    "dominant_spend_category": "food",
    "savings_rate": 0.07
  },
  {
    "customer_id": "2",
    "name": "Maria Constantin",
    "initials": "MC",
    "age": 23,
    "city": "Bucharest",
    "income": 3488,
    "savings": 7140,
    "debt": 7164,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 1,
    "homeowner_status": "owner",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Other",
    "financial_health": "watchlist",
    "match_score": 30,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-03-02"
      }
    ],
    "monthly_savings": -8432.67,
    "avg_expenses": 25872.67,
    "balance_trend": "declining",
    "dominant_spend_category": "shopping",
    "savings_rate": -2.42
  },
  {
    "customer_id": "3",
    "name": "Alexandru Ionescu",
    "initials": "AI",
    "age": 49,
    "city": "Timisoara",
    "income": 7557,
    "savings": 1425,
    "debt": 24864,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 1,
    "homeowner_status": "owner",
    "existing_products": [],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 68,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-01-26"
      }
    ],
    "monthly_savings": 17812.33,
    "avg_expenses": 19972.67,
    "balance_trend": "growing",
    "dominant_spend_category": "travel",
    "savings_rate": 2.36
  },
  {
    "customer_id": "4",
    "name": "Elena Dumitrescu",
    "initials": "ED",
    "age": 44,
    "city": "Timisoara",
    "income": 4674,
    "savings": 7078,
    "debt": 12449,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 0,
    "homeowner_status": "owner",
    "existing_products": [
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 35,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-01-21"
      }
    ],
    "monthly_savings": -8250.0,
    "avg_expenses": 22272.0,
    "balance_trend": "declining",
    "dominant_spend_category": "subscriptions",
    "savings_rate": -1.77
  },
  {
    "customer_id": "5",
    "name": "Mihai Popa",
    "initials": "MP",
    "age": 26,
    "city": "Cluj",
    "income": 4291,
    "savings": 37178,
    "debt": 9606,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage",
      "credit_card",
      "debit_card"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 55,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-01-30"
      }
    ],
    "monthly_savings": -7892.67,
    "avg_expenses": 23626.33,
    "balance_trend": "declining",
    "dominant_spend_category": "travel",
    "savings_rate": -1.84
  },
  {
    "customer_id": "6",
    "name": "Ana-Maria Gheorghe",
    "initials": "AG",
    "age": 32,
    "city": "Timisoara",
    "income": 6814,
    "savings": 7619,
    "debt": 12455,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "rent",
    "existing_products": [
      "loan",
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 54,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-02-25"
      }
    ],
    "monthly_savings": 3988.67,
    "avg_expenses": 25538.67,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 0.59
  },
  {
    "customer_id": "7",
    "name": "Cristian Moldovan",
    "initials": "CM",
    "age": 51,
    "city": "Iasi",
    "income": 5803,
    "savings": 36005,
    "debt": 23892,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card"
    ],
    "segment": "Premium",
    "financial_health": "at-risk",
    "match_score": 43,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-03-04"
      }
    ],
    "monthly_savings": -18982.0,
    "avg_expenses": 26719.33,
    "balance_trend": "declining",
    "dominant_spend_category": "food",
    "savings_rate": -3.27
  },
  {
    "customer_id": "8",
    "name": "Ioana Stanciu",
    "initials": "IS",
    "age": 26,
    "city": "Bucharest",
    "income": 6752,
    "savings": 3103,
    "debt": 26379,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 1,
    "homeowner_status": "owner",
    "existing_products": [
      "loan",
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 62,
    "events": [],
    "monthly_savings": 10751.67,
    "avg_expenses": 16256.33,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 1.59
  },
  {
    "customer_id": "9",
    "name": "Bogdan Nistor",
    "initials": "BN",
    "age": 30,
    "city": "Bucharest",
    "income": 9482,
    "savings": 43129,
    "debt": 15035,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "owner",
    "existing_products": [
      "credit_card"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 89,
    "events": [
      {
        "event_type": "salary_increase",
        "date": "2025-01-09"
      }
    ],
    "monthly_savings": 23187.67,
    "avg_expenses": 21061.67,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 2.45
  },
  {
    "customer_id": "10",
    "name": "Laura Ciobanu",
    "initials": "LC",
    "age": 29,
    "city": "Bucharest",
    "income": 8930,
    "savings": 15373,
    "debt": 4532,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "loan",
      "current_account",
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 60,
    "events": [],
    "monthly_savings": 11998.33,
    "avg_expenses": 20745.0,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 1.34
  },
  {
    "customer_id": "11",
    "name": "Radu Munteanu",
    "initials": "RM",
    "age": 22,
    "city": "Cluj",
    "income": 9304,
    "savings": 26009,
    "debt": 19526,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 2,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage",
      "credit_card"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 66,
    "events": [],
    "monthly_savings": -3887.67,
    "avg_expenses": 19394.33,
    "balance_trend": "declining",
    "dominant_spend_category": "travel",
    "savings_rate": -0.42
  },
  {
    "customer_id": "12",
    "name": "Simona Florescu",
    "initials": "SF",
    "age": 54,
    "city": "Bucharest",
    "income": 7808,
    "savings": 29492,
    "debt": 5182,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "rent",
    "existing_products": [
      "current_account",
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "healthy",
    "match_score": 74,
    "events": [],
    "monthly_savings": 4510.67,
    "avg_expenses": 26721.33,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 0.58
  },
  {
    "customer_id": "13",
    "name": "Vlad Dima",
    "initials": "VD",
    "age": 55,
    "city": "Cluj",
    "income": 5504,
    "savings": 25504,
    "debt": 24985,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Standard",
    "financial_health": "at-risk",
    "match_score": 72,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-01-28"
      }
    ],
    "monthly_savings": 1568.67,
    "avg_expenses": 22282.0,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 0.29
  },
  {
    "customer_id": "14",
    "name": "Oana Tudor",
    "initials": "OT",
    "age": 37,
    "city": "Cluj",
    "income": 4832,
    "savings": 24788,
    "debt": 28793,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card",
      "current_account"
    ],
    "segment": "Standard",
    "financial_health": "at-risk",
    "match_score": 64,
    "events": [
      {
        "event_type": "salary_increase",
        "date": "2025-02-09"
      }
    ],
    "monthly_savings": -3324.33,
    "avg_expenses": 22652.33,
    "balance_trend": "declining",
    "dominant_spend_category": "rent",
    "savings_rate": -0.69
  },
  {
    "customer_id": "15",
    "name": "Dan Apostol",
    "initials": "DA",
    "age": 35,
    "city": "Bucharest",
    "income": 5103,
    "savings": 44237,
    "debt": 15574,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "owner",
    "existing_products": [
      "debit_card",
      "credit_card",
      "loan"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 37,
    "events": [],
    "monthly_savings": -7688.33,
    "avg_expenses": 28100.33,
    "balance_trend": "declining",
    "dominant_spend_category": "shopping",
    "savings_rate": -1.51
  },
  {
    "customer_id": "16",
    "name": "Adriana Mihai",
    "initials": "AM",
    "age": 36,
    "city": "Cluj",
    "income": 10177,
    "savings": 34919,
    "debt": 14794,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 1,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 95,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-03-29"
      }
    ],
    "monthly_savings": 32057.67,
    "avg_expenses": 22219.67,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 3.15
  },
  {
    "customer_id": "17",
    "name": "Liviu Barbu",
    "initials": "LB",
    "age": 24,
    "city": "Timisoara",
    "income": 3117,
    "savings": 5652,
    "debt": 23194,
    "risk_profile": "low",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [
      "current_account",
      "debit_card"
    ],
    "segment": "Other",
    "financial_health": "at-risk",
    "match_score": 31,
    "events": [],
    "monthly_savings": -7282.0,
    "avg_expenses": 20789.0,
    "balance_trend": "declining",
    "dominant_spend_category": "shopping",
    "savings_rate": -2.34
  },
  {
    "customer_id": "18",
    "name": "Raluca Stan",
    "initials": "RS",
    "age": 37,
    "city": "Iasi",
    "income": 6510,
    "savings": 36339,
    "debt": 4335,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage",
      "loan"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 67,
    "events": [],
    "monthly_savings": 14365.67,
    "avg_expenses": 20354.33,
    "balance_trend": "growing",
    "dominant_spend_category": "travel",
    "savings_rate": 2.21
  },
  {
    "customer_id": "19",
    "name": "Stefan Ionescu",
    "initials": "SI",
    "age": 28,
    "city": "Cluj",
    "income": 10062,
    "savings": 24219,
    "debt": 13879,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "loan",
      "current_account"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 57,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-02-13"
      }
    ],
    "monthly_savings": 8828.33,
    "avg_expenses": 31419.67,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 0.88
  },
  {
    "customer_id": "20",
    "name": "Catalina Pop",
    "initials": "CP",
    "age": 33,
    "city": "Timisoara",
    "income": 6139,
    "savings": 13465,
    "debt": 17573,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 0,
    "homeowner_status": "owner",
    "existing_products": [
      "debit_card",
      "loan"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 42,
    "events": [],
    "monthly_savings": -5990.33,
    "avg_expenses": 20314.67,
    "balance_trend": "declining",
    "dominant_spend_category": "food",
    "savings_rate": -0.98
  },
  {
    "customer_id": "21",
    "name": "Florin Manole",
    "initials": "FM",
    "age": 32,
    "city": "Iasi",
    "income": 4604,
    "savings": 4315,
    "debt": 21369,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 1,
    "homeowner_status": "owner",
    "existing_products": [
      "current_account",
      "debit_card"
    ],
    "segment": "Standard",
    "financial_health": "at-risk",
    "match_score": 34,
    "events": [],
    "monthly_savings": -9035.67,
    "avg_expenses": 18243.67,
    "balance_trend": "declining",
    "dominant_spend_category": "shopping",
    "savings_rate": -1.96
  },
  {
    "customer_id": "22",
    "name": "Diana Ungureanu",
    "initials": "DU",
    "age": 38,
    "city": "Iasi",
    "income": 3960,
    "savings": 11789,
    "debt": 12418,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "loan"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 47,
    "events": [],
    "monthly_savings": -1128.67,
    "avg_expenses": 18288.67,
    "balance_trend": "declining",
    "dominant_spend_category": "travel",
    "savings_rate": -0.29
  },
  {
    "customer_id": "23",
    "name": "Cosmin Avram",
    "initials": "CA",
    "age": 25,
    "city": "Timisoara",
    "income": 6111,
    "savings": 20445,
    "debt": 7133,
    "risk_profile": "low",
    "marital_status": "single",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Standard",
    "financial_health": "healthy",
    "match_score": 56,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-01-09"
      }
    ],
    "monthly_savings": -10175.67,
    "avg_expenses": 16286.67,
    "balance_trend": "declining",
    "dominant_spend_category": "rent",
    "savings_rate": -1.67
  },
  {
    "customer_id": "24",
    "name": "Gabriela Rusu",
    "initials": "GR",
    "age": 26,
    "city": "Bucharest",
    "income": 3931,
    "savings": 34281,
    "debt": 2625,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 1,
    "homeowner_status": "rent",
    "existing_products": [
      "current_account"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 37,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-02-23"
      }
    ],
    "monthly_savings": -16123.67,
    "avg_expenses": 26606.33,
    "balance_trend": "declining",
    "dominant_spend_category": "rent",
    "savings_rate": -4.1
  },
  {
    "customer_id": "25",
    "name": "Ionut Luca",
    "initials": "IL",
    "age": 38,
    "city": "Bucharest",
    "income": 4343,
    "savings": 28474,
    "debt": 21540,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 1,
    "homeowner_status": "owner",
    "existing_products": [
      "mortgage",
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "at-risk",
    "match_score": 73,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-03-30"
      }
    ],
    "monthly_savings": 2104.67,
    "avg_expenses": 26848.67,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 0.48
  },
  {
    "customer_id": "26",
    "name": "Monica Serban",
    "initials": "MS",
    "age": 26,
    "city": "Cluj",
    "income": 9484,
    "savings": 9577,
    "debt": 22009,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "credit_card",
      "loan"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 60,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-03-23"
      }
    ],
    "monthly_savings": 12211.67,
    "avg_expenses": 22563.0,
    "balance_trend": "growing",
    "dominant_spend_category": "food",
    "savings_rate": 1.29
  },
  {
    "customer_id": "27",
    "name": "Dragos Ardelean",
    "initials": "DA",
    "age": 45,
    "city": "Timisoara",
    "income": 11288,
    "savings": 18380,
    "debt": 4340,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 2,
    "homeowner_status": "rent",
    "existing_products": [
      "current_account",
      "debit_card"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 96,
    "events": [],
    "monthly_savings": 37907.0,
    "avg_expenses": 22295.67,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 3.36
  },
  {
    "customer_id": "28",
    "name": "Roxana Anca",
    "initials": "RA",
    "age": 29,
    "city": "Cluj",
    "income": 7905,
    "savings": 44475,
    "debt": 3394,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [
      "credit_card"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 80,
    "events": [],
    "monthly_savings": 10200.67,
    "avg_expenses": 26689.33,
    "balance_trend": "growing",
    "dominant_spend_category": "subscriptions",
    "savings_rate": 1.29
  },
  {
    "customer_id": "29",
    "name": "Catalin Toma",
    "initials": "CT",
    "age": 38,
    "city": "Iasi",
    "income": 6450,
    "savings": 48029,
    "debt": 11235,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 0,
    "homeowner_status": "owner",
    "existing_products": [],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 65,
    "events": [],
    "monthly_savings": -3460.67,
    "avg_expenses": 29260.67,
    "balance_trend": "declining",
    "dominant_spend_category": "food",
    "savings_rate": -0.54
  },
  {
    "customer_id": "30",
    "name": "Denisa Grigore",
    "initials": "DG",
    "age": 32,
    "city": "Iasi",
    "income": 7533,
    "savings": 3889,
    "debt": 116,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card",
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "healthy",
    "match_score": 87,
    "events": [
      {
        "event_type": "new_subscription",
        "date": "2025-03-31"
      }
    ],
    "monthly_savings": 34840.67,
    "avg_expenses": 22912.33,
    "balance_trend": "growing",
    "dominant_spend_category": "travel",
    "savings_rate": 4.63
  },
  {
    "customer_id": "31",
    "name": "Marian Boboc",
    "initials": "MB",
    "age": 24,
    "city": "Timisoara",
    "income": 4232,
    "savings": 46286,
    "debt": 29619,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "at-risk",
    "match_score": 63,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-02-11"
      }
    ],
    "monthly_savings": -3687.67,
    "avg_expenses": 20615.67,
    "balance_trend": "declining",
    "dominant_spend_category": "subscriptions",
    "savings_rate": -0.87
  },
  {
    "customer_id": "32",
    "name": "Valentina Enache",
    "initials": "VE",
    "age": 35,
    "city": "Bucharest",
    "income": 3685,
    "savings": 21202,
    "debt": 11948,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 49,
    "events": [],
    "monthly_savings": -9571.67,
    "avg_expenses": 20626.67,
    "balance_trend": "declining",
    "dominant_spend_category": "rent",
    "savings_rate": -2.6
  },
  {
    "customer_id": "33",
    "name": "Silviu Chitu",
    "initials": "SC",
    "age": 48,
    "city": "Cluj",
    "income": 5532,
    "savings": 16514,
    "debt": 28331,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card"
    ],
    "segment": "Standard",
    "financial_health": "at-risk",
    "match_score": 75,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-04-01"
      }
    ],
    "monthly_savings": 3683.33,
    "avg_expenses": 14756.67,
    "balance_trend": "growing",
    "dominant_spend_category": "subscriptions",
    "savings_rate": 0.67
  },
  {
    "customer_id": "34",
    "name": "Paula Buta",
    "initials": "PB",
    "age": 52,
    "city": "Bucharest",
    "income": 7371,
    "savings": 11433,
    "debt": 25800,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [
      "current_account",
      "loan"
    ],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 84,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-02-01"
      }
    ],
    "monthly_savings": 31609.0,
    "avg_expenses": 24902.0,
    "balance_trend": "growing",
    "dominant_spend_category": "subscriptions",
    "savings_rate": 4.29
  },
  {
    "customer_id": "35",
    "name": "Gabriel Radulescu",
    "initials": "GR",
    "age": 39,
    "city": "Cluj",
    "income": 6728,
    "savings": 15609,
    "debt": 775,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "owner",
    "existing_products": [
      "debit_card",
      "loan",
      "credit_card"
    ],
    "segment": "Standard",
    "financial_health": "healthy",
    "match_score": 64,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-01-03"
      }
    ],
    "monthly_savings": 12514.33,
    "avg_expenses": 25611.0,
    "balance_trend": "growing",
    "dominant_spend_category": "travel",
    "savings_rate": 1.86
  },
  {
    "customer_id": "36",
    "name": "Teodora Iordache",
    "initials": "TI",
    "age": 38,
    "city": "Cluj",
    "income": 3452,
    "savings": 8559,
    "debt": 28738,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [
      "debit_card",
      "mortgage"
    ],
    "segment": "Other",
    "financial_health": "at-risk",
    "match_score": 27,
    "events": [
      {
        "event_type": "salary_increase",
        "date": "2025-02-19"
      }
    ],
    "monthly_savings": -9801.67,
    "avg_expenses": 27061.67,
    "balance_trend": "declining",
    "dominant_spend_category": "travel",
    "savings_rate": -2.84
  },
  {
    "customer_id": "37",
    "name": "Razvan Muscalu",
    "initials": "RM",
    "age": 34,
    "city": "Timisoara",
    "income": 10149,
    "savings": 40728,
    "debt": 16758,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "loan"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 56,
    "events": [],
    "monthly_savings": 7673.33,
    "avg_expenses": 19390.67,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 0.76
  },
  {
    "customer_id": "38",
    "name": "Claudia Danila",
    "initials": "CD",
    "age": 29,
    "city": "Timisoara",
    "income": 8967,
    "savings": 29265,
    "debt": 2292,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "owner",
    "existing_products": [
      "credit_card",
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 77,
    "events": [],
    "monthly_savings": 8890.0,
    "avg_expenses": 26978.0,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 0.99
  },
  {
    "customer_id": "39",
    "name": "Sebastian Costa",
    "initials": "SC",
    "age": 46,
    "city": "Bucharest",
    "income": 9592,
    "savings": 46692,
    "debt": 9688,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "debit_card",
      "loan"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 47,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-03-01"
      }
    ],
    "monthly_savings": -2863.0,
    "avg_expenses": 15652.33,
    "balance_trend": "declining",
    "dominant_spend_category": "subscriptions",
    "savings_rate": -0.3
  },
  {
    "customer_id": "40",
    "name": "Anamaria Lazar",
    "initials": "AL",
    "age": 42,
    "city": "Iasi",
    "income": 7978,
    "savings": 19803,
    "debt": 6887,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 1,
    "homeowner_status": "owner",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Standard",
    "financial_health": "healthy",
    "match_score": 80,
    "events": [],
    "monthly_savings": 10321.67,
    "avg_expenses": 18931.0,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 1.29
  },
  {
    "customer_id": "41",
    "name": "Tudor Grosu",
    "initials": "TG",
    "age": 43,
    "city": "Cluj",
    "income": 5780,
    "savings": 44178,
    "debt": 2778,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 1,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 58,
    "events": [],
    "monthly_savings": -8189.33,
    "avg_expenses": 21676.0,
    "balance_trend": "declining",
    "dominant_spend_category": "shopping",
    "savings_rate": -1.42
  },
  {
    "customer_id": "42",
    "name": "Nicoleta Dobre",
    "initials": "ND",
    "age": 26,
    "city": "Iasi",
    "income": 5414,
    "savings": 2600,
    "debt": 1514,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 3,
    "homeowner_status": "owner",
    "existing_products": [
      "loan"
    ],
    "segment": "Standard",
    "financial_health": "healthy",
    "match_score": 59,
    "events": [],
    "monthly_savings": 6664.33,
    "avg_expenses": 24015.0,
    "balance_trend": "growing",
    "dominant_spend_category": "travel",
    "savings_rate": 1.23
  },
  {
    "customer_id": "43",
    "name": "Ciprian Coman",
    "initials": "CC",
    "age": 49,
    "city": "Bucharest",
    "income": 9547,
    "savings": 16989,
    "debt": 4835,
    "risk_profile": "low",
    "marital_status": "married",
    "dependents_count": 0,
    "homeowner_status": "rent",
    "existing_products": [
      "current_account",
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 90,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-02-19"
      }
    ],
    "monthly_savings": 24074.67,
    "avg_expenses": 14113.33,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 2.52
  },
  {
    "customer_id": "44",
    "name": "Larisa Patru",
    "initials": "LP",
    "age": 42,
    "city": "Iasi",
    "income": 4988,
    "savings": 30914,
    "debt": 4369,
    "risk_profile": "high",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 77,
    "events": [],
    "monthly_savings": 4513.0,
    "avg_expenses": 15439.0,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 0.9
  },
  {
    "customer_id": "45",
    "name": "Mihail Sandu",
    "initials": "MS",
    "age": 39,
    "city": "Iasi",
    "income": 10777,
    "savings": 30495,
    "debt": 8493,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 100,
    "events": [],
    "monthly_savings": 47797.0,
    "avg_expenses": 9680.33,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 4.44
  },
  {
    "customer_id": "46",
    "name": "Alina Diaconu",
    "initials": "AD",
    "age": 43,
    "city": "Timisoara",
    "income": 4269,
    "savings": 47762,
    "debt": 9362,
    "risk_profile": "high",
    "marital_status": "single",
    "dependents_count": 1,
    "homeowner_status": "rent",
    "existing_products": [
      "credit_card"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 82,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-02-16"
      }
    ],
    "monthly_savings": 6915.33,
    "avg_expenses": 22967.67,
    "balance_trend": "growing",
    "dominant_spend_category": "rent",
    "savings_rate": 1.62
  },
  {
    "customer_id": "47",
    "name": "Emanuel Draghici",
    "initials": "ED",
    "age": 35,
    "city": "Cluj",
    "income": 6788,
    "savings": 26102,
    "debt": 22739,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [],
    "segment": "Standard",
    "financial_health": "watchlist",
    "match_score": 78,
    "events": [],
    "monthly_savings": 6886.33,
    "avg_expenses": 22528.33,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 1.01
  },
  {
    "customer_id": "48",
    "name": "Cristina Badea",
    "initials": "CB",
    "age": 23,
    "city": "Iasi",
    "income": 9812,
    "savings": 5080,
    "debt": 6777,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 2,
    "homeowner_status": "owner",
    "existing_products": [
      "loan",
      "mortgage"
    ],
    "segment": "Premium",
    "financial_health": "healthy",
    "match_score": 59,
    "events": [
      {
        "event_type": "travel_spike",
        "date": "2025-01-29"
      }
    ],
    "monthly_savings": 11879.33,
    "avg_expenses": 20827.33,
    "balance_trend": "growing",
    "dominant_spend_category": "food",
    "savings_rate": 1.21
  },
  {
    "customer_id": "49",
    "name": "Robert Pascu",
    "initials": "RP",
    "age": 53,
    "city": "Bucharest",
    "income": 9389,
    "savings": 28460,
    "debt": 17636,
    "risk_profile": "moderate",
    "marital_status": "married",
    "dependents_count": 3,
    "homeowner_status": "rent",
    "existing_products": [
      "mortgage",
      "debit_card"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 87,
    "events": [],
    "monthly_savings": 20459.33,
    "avg_expenses": 26485.67,
    "balance_trend": "growing",
    "dominant_spend_category": "shopping",
    "savings_rate": 2.18
  },
  {
    "customer_id": "50",
    "name": "Sorina Nedelcu",
    "initials": "SN",
    "age": 30,
    "city": "Cluj",
    "income": 9371,
    "savings": 23028,
    "debt": 21917,
    "risk_profile": "moderate",
    "marital_status": "single",
    "dependents_count": 0,
    "homeowner_status": "owner",
    "existing_products": [
      "loan",
      "debit_card"
    ],
    "segment": "Premium",
    "financial_health": "watchlist",
    "match_score": 81,
    "events": [
      {
        "event_type": "rent_increase",
        "date": "2025-03-13"
      }
    ],
    "monthly_savings": 36495.67,
    "avg_expenses": 25977.67,
    "balance_trend": "growing",
    "dominant_spend_category": "travel",
    "savings_rate": 3.89
  }
];

export function getMockCustomer(id: string): MockCustomer | undefined {
  return MOCK_CUSTOMERS.find(c => c.customer_id === id);
}