export interface ApiRoute {
  api_id: string;
  base_path: string;
  target_url: string;
  methods: string[];
  required_headers?: {
    name: string;
    value: string;
    is_static: boolean;
  }[];
  strip_path_prefix?: boolean;
  log_level?: string;
}
