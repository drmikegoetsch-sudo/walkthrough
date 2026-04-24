export interface Facility {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  floor_plan_url: string;
  floor_plan_width: number;
  floor_plan_height: number;
  created_at: string;
}

export interface Waypoint {
  id: string;
  facility_id: string;
  label: string;
  x: number;
  y: number;
  sequence_order: number;
  ai_suggested: boolean;
  created_at: string;
}

export interface WalkSession {
  id: string;
  facility_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed";
}

export interface Photo {
  id: string;
  session_id: string;
  waypoint_id: string | null;
  facility_id: string;
  storage_path: string;
  public_url: string;
  captured_at: string;
  capture_source: "phone" | "glasses";
}

export interface WaypointWithPhotos extends Waypoint {
  photos: Photo[];
}
