
export interface DatabaseResult {
  error: boolean; message: string; data: any;
}

export interface coordinates {
  x: number; y: number; z: number;
}

export interface warpRoute {
  id: string; x: number; y: number; z: number;
}
