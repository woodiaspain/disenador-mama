export interface GarmentMeasurements {
  waist_half: number;
  hip_half: number;
  front_rise: number;
  back_rise: number;
  thigh_half: number;
  knee_half: number;
  leg_opening_half: number;
  inseam: number;
  outseam_incl_wb: number;
}

export interface GarmentSpecs {
  style_name: string;
  style_code: string;
  garment_type: string;
  fit_description: string;
  date: string;
  sample_size: string;
  washing: string;
  colour: string;
  dyeing: string;
  deadline: string;
  contact: string;
  key_details: string[];
  measurements: GarmentMeasurements;
  topstitch_thread: string;
  rivet_finish: string;
  washing_instructions: string[];
  special_construction: string[];
  fit_notes: string;
  needs_clarification: boolean;
  clarification_question: string;
}
