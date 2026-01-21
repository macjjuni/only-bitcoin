import { NextResponse } from "next/server"
import { supabase } from "@/shared/lib/supabase"

export async function GET() {
  try {
    // Supabase 연결 테스트 - 존재하지 않는 테이블 조회
    const { error } = await supabase.from('_test_connection').select('*').limit(1)

    // 테이블 없음 에러(PGRST116, PGRST205)는 연결 성공으로 간주
    const isConnected = !error || error.code === 'PGRST116' || error.code === 'PGRST205'

    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: "Supabase 연결 성공!"
      })
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 })

  } catch (error) {
    console.error("Supabase Test Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}