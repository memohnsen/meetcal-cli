export type CarolinaTab = "youth" | "junior" | "senior" | "masters";

export type WsoOwlCmsReferenceMeta = {
  ageMin: string;
  ageMax: string;
  bodyWeightMin: string;
  bodyWeightMax: string;
};

export type WsoOwlCmsParsedLift = {
  lift: string;
  record: number | null;
  name: string;
  date: string;
  place: string;
};

export type WsoOwlCmsParsedBlock = {
  weightClass: string;
  ageGroup: string;
  genderCode: string;
  lifts: WsoOwlCmsParsedLift[];
};
