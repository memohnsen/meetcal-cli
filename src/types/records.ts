export interface Record {
  weightClass: string;
  snatchRecord: number;
  cjRecord: number;
  totalRecord: number;
  gender: Gender
  ageCategory: string
  recordType: Federation
}

type Gender = "Men" | "Women";
type Federation = "IWF" | "USAMW" | "USAW" | "UMWF"
