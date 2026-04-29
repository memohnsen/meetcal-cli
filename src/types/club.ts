import LiftingResults from "./liftingResults";

export interface AthleteClub {
  member_id: string;
  name: string;
  club: string;
  meet: string;
}

export interface ClubMeetStats {
  totalAthletes: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
  totalPRs: number;
  perfect6for6: number;
  totalWeightLifted: number;
  athleteResults: LiftingResults[];
}

export interface AthleteInfo {
  name: string;
  age: number;
  gender: string;
  weight_class: string;
}

export interface AthleteWeightClass {
  name: string;
  weight_class: string;
}

export interface MeetStatus {
  name: string;
  status: string;
}
