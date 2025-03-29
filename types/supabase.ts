export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaskPriority = "low" | "medium" | "high";

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          completed: boolean;
          priority: TaskPriority;
          estimated_hours: number | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          completed?: boolean;
          priority?: TaskPriority;
          estimated_hours?: number | null;
          user_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          completed?: boolean;
          priority?: TaskPriority;
          estimated_hours?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_items: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          completed: boolean;
          priority: TaskPriority;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title?: string;
          completed?: boolean;
          priority?: TaskPriority;
          user_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          completed?: boolean;
          priority?: TaskPriority;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_items_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      watch_items: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          completed: boolean;
          priority: TaskPriority;
          estimated_hours: number | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title?: string;
          completed?: boolean;
          priority?: TaskPriority;
          estimated_hours?: number | null;
          user_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          completed?: boolean;
          priority?: TaskPriority;
          estimated_hours?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watch_items_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      task_priority: TaskPriority;
    };
  };
}
