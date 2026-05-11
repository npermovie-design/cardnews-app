import { useState } from "react";

const BRAND = "#3b82f6";

const GUIDE_SECTIONS = [
  {
    id: "getting-started",
    title: "시작하기",
    guides: [
      {
        id: "signup",
        title: "회원가입 및 로그인",
        desc: "SNS메이킷에 가입하고 AI 도구를 시작하는 방법을 안내합니다",
        category: "기본",
        steps: [
          { title: "홈페이지 접속", body: "브라우저에서 snsmakeit.com에 접속합니다. 우측 상단에 '로그인' 버튼이 보입니다. 이 버튼을 클릭하면 로그인 화면으로 이동합니다. 아직 계정이 없다면 로그인 화면 하단의 '회원가입' 링크를 클릭하세요." },
          { title: "계정 생성", body: "회원가입 화면에서 이메일 주소와 비밀번호를 입력합니다. 비밀번호는 8자 이상이어야 합니다. Google 계정으로 간편 가입도 가능합니다. Google 버튼을 클릭하면 기존 Google 계정으로 바로 가입할 수 있어 별도의 비밀번호 설정이 필요 없습니다." },
          { title: "닉네임 설정", body: "가입 후 닉네임을 설정하는 화면이 나옵니다. 커뮤니티와 게시판에서 사용될 이름이므로, 활동에 적합한 닉네임을 입력하세요. 나중에 마이페이지에서 변경할 수 있습니다." },
          { title: "무료 체험 시작", body: "가입이 완료되면 자동으로 로그인되고, 5회 무료 체험이 즉시 제공됩니다. 별도의 카드 등록이나 결제 없이 바로 AI 글쓰기, 키워드 분석 등 모든 도구를 체험할 수 있습니다. 잔여 횟수는 프로필 메뉴에서 확인할 수 있습니다." },
        ],
      },
      {
        id: "dashboard",
        title: "대시보드 둘러보기",
        desc: "메인 화면 구성과 각 메뉴의 역할을 상세히 알아봅니다",
        category: "기본",
        steps: [
          { title: "상단 네비게이션 메뉴", body: "화면 상단에 고정된 네비게이션 바에는 주요 메뉴가 배치되어 있습니다.\n\n- 홈: 서비스 소개와 주요 기능 안내\n- 제품: AI 글쓰기, 자동 발행 등 핵심 도구 페이지\n- 클래스: 온라인 강의(VOD/라이브) 수강\n- 성장 프로그램: SNS 운영 성장 프로그램 참여\n- 커뮤니티: 정보 공유, Q&A, 후기 게시판\n- 고객센터: 사용방법, 공지사항, 요금, 문의" },
          { title: "AI 도구 페이지", body: "상단 메뉴에서 '제품'을 클릭하면 제품 소개 페이지로 이동합니다. 여기서 데스크톱 프로그램을 다운로드하거나 웹 도구의 상세 설명을 확인할 수 있습니다.\n\n웹에서 직접 사용할 수 있는 도구:\n- AI 블로그 글쓰기\n- SNS 콘텐츠 생성 (인스타, 스레드)\n- 키워드 트렌드 분석\n- SNS 계정 연결 및 발행" },
          { title: "마이페이지 확인", body: "우측 상단의 프로필 아이콘을 클릭하면 드롭다운 메뉴가 열립니다.\n\n확인할 수 있는 정보:\n- 현재 플랜 (Free / Basic / Pro / Business)\n- 잔여 AI 사용 횟수\n- 가입일 및 계정 정보\n- 내 보관함 (생성한 글 목록)\n\n플랜을 변경하고 싶으면 '마이페이지'에서 '구독 관리'를 클릭하세요." },
          { title: "언어 및 테마 설정", body: "우측 상단에서 언어를 한국어, English, 日本語 중 선택할 수 있습니다. 선택한 언어에 따라 메뉴와 도구 화면이 모두 전환됩니다.\n\n다크모드/라이트모드 전환은 마이페이지 설정에서 가능합니다." },
        ],
      },
      {
        id: "plan-guide",
        title: "요금제 및 플랜 안내",
        desc: "Free, Basic, Pro, Business 플랜의 차이와 결제 방법",
        category: "기본",
        steps: [
          { title: "플랜 종류 확인", body: "SNS메이킷은 4가지 플랜을 제공합니다.\n\n- Free: 관리자 체험권 부여 시 사용 가능 (5회)\n- Basic ($9.9/월): 월 30회 콘텐츠 생성\n- Pro ($19.9/월): 월 200회 + 자동 발행 일 3회 (추천)\n- Business ($39.9/월): 월 700회 + 자동 발행 일 10회 + 카페 발행\n\n모든 플랜에서 커뮤니티, 키워드 분석, SNS 플랫폼 연동을 사용할 수 있습니다." },
          { title: "결제 방법", body: "결제는 LemonSqueezy를 통해 처리됩니다. Visa, Mastercard, PayPal 등 해외 결제가 가능합니다.\n\n월간 결제와 연간 결제를 선택할 수 있으며, 연간 결제 시 약 17% 할인됩니다.\n\n요금 페이지에서 원하는 플랜의 '시작하기' 버튼을 클릭하면 결제 팝업이 열립니다." },
          { title: "플랜 변경 및 취소", body: "마이페이지에서 언제든 플랜을 변경하거나 취소할 수 있습니다. 취소 시 현재 결제 주기가 끝날 때까지 기존 플랜을 이용할 수 있습니다.\n\n미사용 횟수는 다음 달로 이월되지 않으며, 매월 결제일에 초기화됩니다." },
          { title: "환불 정책", body: "구매 후 7일 이내에 서비스를 사용하지 않은 경우 전액 환불이 가능합니다. 고객센터의 '문의하기' 또는 이메일(npermovie@naver.com)로 요청할 수 있습니다.\n\n부분 사용 후에는 잔여 기간에 대한 비례 환불은 제공되지 않습니다." },
        ],
      },
    ],
  },
  {
    id: "ai-writing",
    title: "AI 글쓰기 (웹)",
    guides: [
      {
        id: "blog-write",
        title: "블로그 글 자동 생성",
        desc: "주제를 입력하면 AI가 네이버/티스토리용 블로그 글을 자동 작성합니다",
        category: "글쓰기",
        steps: [
          { title: "AI 글쓰기 도구 접속", body: "로그인 후 AI 도구 페이지에서 '블로그 글쓰기'를 선택합니다.\n\n글쓰기 화면이 열리면 상단에 주제 입력 필드가 보입니다. 여기에 글의 주제를 구체적으로 입력할수록 AI가 더 정확한 글을 생성합니다.\n\n예시:\n- '1인 사업자를 위한 블로그 마케팅 전략 5가지'\n- '2026년 카페 창업 비용과 절차 총정리'\n- '강아지 산책 시 주의사항과 추천 코스'" },
          { title: "세부 옵션 설정", body: "주제 입력 후 세부 옵션을 조정할 수 있습니다.\n\n- 글 길이: 짧게(800자) / 보통(1,500자) / 길게(3,000자)\n- 톤앤매너: 친근한 / 전문적인 / 정보 전달형\n- 타겟 플랫폼: 네이버 블로그 / 티스토리 / 범용\n- 키워드 포인트: 특정 키워드를 강조색으로 표시\n- 인용구 스타일: 따옴표 / 버티컬 라인 / 말풍선 등 6종\n\n플랫폼을 선택하면 해당 플랫폼에 맞는 글 구조와 SEO 최적화가 적용됩니다." },
          { title: "글 생성 실행", body: "'생성' 버튼을 클릭하면 AI가 글을 작성하기 시작합니다. 보통 10~30초 정도 소요됩니다.\n\n생성되는 글에는 다음이 자동으로 포함됩니다:\n- SEO 최적화된 제목\n- 소제목으로 구분된 본문 구조\n- 핵심 키워드 강조\n- 인용구와 요약\n- 관련 이미지 위치 표시\n\n생성 중 화면에서 실시간으로 글이 작성되는 과정을 확인할 수 있습니다." },
          { title: "글 편집 및 활용", body: "생성이 완료되면 미리보기 화면에서 전체 글을 확인할 수 있습니다.\n\n가능한 작업:\n- 본문 직접 수정: 클릭해서 텍스트를 자유롭게 편집\n- 복사: '복사' 버튼으로 전체 글을 클립보드에 복사\n- 보관함 저장: '저장' 버튼으로 내 보관함에 저장 (나중에 다시 열람 가능)\n- HTML 복사: 네이버 블로그 에디터에 바로 붙여넣기 가능한 형태\n\n생성된 글은 상업적으로 자유롭게 사용할 수 있습니다. 발행 전 내용을 한 번 검수하면 더 좋은 결과를 얻을 수 있습니다." },
        ],
      },
      {
        id: "insta-caption",
        title: "인스타그램 캡션 및 SNS 콘텐츠 생성",
        desc: "인스타그램, 스레드 등 SNS 플랫폼에 맞는 캡션과 해시태그를 생성합니다",
        category: "글쓰기",
        steps: [
          { title: "SNS 콘텐츠 도구 접속", body: "AI 도구에서 '인스타그램 캡션' 또는 'SNS 콘텐츠'를 선택합니다.\n\n게시물의 주제, 분위기, 또는 이미지에 대한 간단한 설명을 입력합니다.\n\n예시:\n- '새로 오픈한 디저트 카페 소개'\n- '가을 감성 여행 사진에 어울리는 캡션'\n- '비즈니스 성장 관련 동기부여 포스트'" },
          { title: "플랫폼 및 스타일 설정", body: "타겟 플랫폼과 글쓰기 스타일을 선택합니다.\n\n플랫폼:\n- 인스타그램 피드\n- 인스타그램 릴스\n- 스레드\n- 범용 SNS\n\n스타일:\n- 캐주얼: 친근하고 가벼운 톤 (일상 공유용)\n- 전문적: 비즈니스/브랜드 공식 톤\n- 감성적: 문학적이고 서정적인 표현\n- 유머: 재치있고 위트있는 톤\n\n각 플랫폼별 최적 글자 수와 형식이 자동으로 적용됩니다." },
          { title: "해시태그 자동 생성", body: "캡션과 함께 관련 해시태그가 자동으로 생성됩니다.\n\n해시태그 구성:\n- 대형 태그 (10만+ 게시물): 노출 기회가 높은 인기 태그\n- 중형 태그 (1만~10만): 적절한 경쟁도의 타겟 태그\n- 소형 태그 (1만 이하): 정확한 타겟팅이 가능한 니치 태그\n\n최대 30개까지 추천되며, 원하는 태그를 선택/해제할 수 있습니다. AI가 게시물 주제와 가장 연관성 높은 조합을 추천합니다." },
          { title: "복사 및 발행", body: "완성된 캡션과 해시태그를 활용하는 방법:\n\n1. '캡션 복사' 버튼: 캡션 텍스트만 복사\n2. '해시태그 복사' 버튼: 해시태그만 복사\n3. '전체 복사' 버튼: 캡션 + 해시태그 한 번에 복사\n\n복사한 텍스트를 인스타그램, 스레드 등 원하는 앱에 바로 붙여넣기 하면 됩니다.\n\nSNS메이킷의 SNS 발행 기능을 사용하면 웹에서 바로 인스타그램에 발행할 수도 있습니다 (SNS 계정 연결 필요)." },
        ],
      },
    ],
  },
  {
    id: "auto-publish",
    title: "자동 발행 (데스크톱 프로그램)",
    guides: [
      {
        id: "naverbot-setup",
        title: "데스크톱 프로그램 설치 및 초기 설정",
        desc: "Windows용 SNS 자동 발행 프로그램을 설치하고 첫 실행까지 진행합니다",
        category: "자동화",
        steps: [
          { title: "설치 파일 다운로드", body: "snsmakeit.com/programs 페이지에서 'Windows 다운로드' 버튼을 클릭합니다.\n\nSNSMakeIt-Setup-0.2.3.exe 파일(약 430MB)이 다운로드됩니다. 다운로드 폴더에서 파일을 확인하세요.\n\n시스템 요구사항:\n- Windows 10 또는 Windows 11\n- 최소 4GB RAM\n- 인터넷 연결 필수\n\nMac 버전은 현재 개발 중이며, 추후 별도로 안내됩니다." },
          { title: "프로그램 설치", body: "다운로드한 .exe 파일을 더블클릭하여 설치를 시작합니다.\n\n설치 과정:\n1. Windows 보안 경고가 뜨면 '추가 정보' > '실행'을 클릭합니다\n2. 설치 경로를 확인합니다 (기본 경로 권장)\n3. '설치' 버튼을 클릭하면 자동으로 설치가 진행됩니다\n4. 설치 완료 후 '실행' 버튼을 클릭하면 프로그램이 바로 시작됩니다\n\n설치는 보통 1~2분 정도 소요됩니다." },
          { title: "SNS메이킷 계정 로그인", body: "프로그램이 실행되면 로그인 화면이 나타납니다.\n\n웹사이트에서 가입한 이메일과 비밀번호를 입력하고 '로그인' 버튼을 클릭합니다.\n\n로그인 후 확인되는 정보:\n- 현재 플랜 (Free / Basic / Pro 등)\n- 잔여 AI 사용 횟수\n- 자동 발행 가능 횟수\n\nPro 플랜 이상에서 자동 발행 기능을 사용할 수 있습니다. Free/Basic 플랜에서는 체험 모드로 기본 기능을 확인할 수 있습니다." },
          { title: "네이버 계정 연결", body: "자동 발행을 위해 네이버 블로그 계정을 연결합니다.\n\n과정:\n1. '계정 설정' 메뉴로 이동합니다\n2. '네이버 로그인' 버튼을 클릭합니다\n3. 네이버 로그인 창에서 아이디와 비밀번호를 입력합니다\n4. 로그인이 완료되면 세션이 저장됩니다\n\n세션이 저장되면 이후 발행 시 별도 로그인 없이 자동으로 발행됩니다. 세션은 일정 기간 후 만료될 수 있으며, 만료 시 다시 로그인하면 됩니다.\n\n여러 네이버 계정을 등록해 순환 발행도 가능합니다 (Business 플랜)." },
          { title: "발행 전 블로그 품질 안내 확인", body: "첫 실행 시 블로그 품질 유지를 위한 안내 화면이 표시됩니다.\n\n권장 사항:\n- 하루 발행량은 1~3개로 시작하세요\n- 발행 간격은 최소 2시간 이상을 권장합니다\n- 동일한 문구의 반복 사용은 피하세요\n- 발행 전 내용을 검수하면 더 좋은 결과를 얻습니다\n- 병원, 금융, 법률 등 민감한 업종은 반드시 직접 검수 후 발행하세요\n\n이 안내를 확인하고 '시작' 버튼을 클릭하면 메인 대시보드로 이동합니다." },
        ],
      },
      {
        id: "quick-publish",
        title: "빠른 발행 (1회 단건 발행)",
        desc: "테마와 카테고리만 입력해서 1개 글을 즉시 작성하고 발행합니다",
        category: "자동화",
        steps: [
          { title: "빠른 시작 영역 선택", body: "프로그램 메인 화면에서 '빠른 시작' 카드를 클릭합니다.\n\n빠른 시작은 복잡한 설정 없이 테마와 카테고리만 입력해서 바로 발행하는 모드입니다. 처음 사용하거나 간단한 1회 발행이 필요할 때 적합합니다." },
          { title: "테마 입력", body: "발행할 글의 테마(주제)를 입력합니다.\n\n좋은 테마 예시:\n- '겨울철 피부 관리 방법'\n- '직장인 퇴근 후 부업 추천'\n- '서울 성수동 카페 추천 BEST 5'\n\n테마를 구체적으로 입력할수록 AI가 더 정확하고 깊이 있는 글을 생성합니다.\n\n제목을 직접 입력할 수도 있고, 비워두면 AI가 자동으로 제목을 생성합니다." },
          { title: "카테고리 선택", body: "네이버 블로그 카테고리를 선택합니다.\n\n카테고리 선택 방식:\n- 직접 선택: 드롭다운에서 원하는 카테고리를 클릭\n- 자동 매칭: 비워두면 AI가 글 내용에 맞는 카테고리를 자동으로 선택\n\n네이버 블로그 템플릿 이름을 입력하면 기존에 만들어둔 템플릿 흐름에 맞춰 발행할 수도 있습니다 (선택 입력)." },
          { title: "발행 실행 및 확인", body: "'발행 시작' 버튼을 클릭하면 다음 과정이 자동으로 진행됩니다:\n\n1. 계정 확인: 네이버 로그인 세션 검증\n2. 글 생성: AI가 테마를 바탕으로 본문 작성 (약 15~30초)\n3. 에디터 입력: 네이버 블로그 에디터에 글 자동 입력\n4. 본문 구성: 인용구, 이미지, 소제목, 스티커 자동 삽입\n5. 발행 완료: 카테고리 선택 후 최종 발행\n\n각 단계의 진행 상황이 프로그레스바로 표시됩니다. 발행이 완료되면 데스크톱 알림이 표시되고, 로그에서 발행된 글의 URL을 바로 열어볼 수 있습니다." },
        ],
      },
      {
        id: "auto-operation",
        title: "자동 운영 모드 (일괄 자동 발행)",
        desc: "매일 자동으로 여러 글을 발행하는 운영 모드를 설정하고 관리합니다",
        category: "자동화",
        steps: [
          { title: "자동 운영 모드 선택", body: "메인 화면에서 '자동 운영' 카드를 클릭합니다.\n\n자동 운영 모드는 설정한 일정에 따라 매일 자동으로 글을 발행하는 기능입니다. 한 번 설정하면 프로그램이 실행되는 동안 자동으로 운영됩니다.\n\nPro 플랜: 하루 최대 3회\nBusiness 플랜: 하루 최대 10회" },
          { title: "주제 및 스타일 설정", body: "자동 발행에 사용할 주제를 설정합니다.\n\n주제 설정:\n- 단일 테마: 하나의 주제로 계속 발행\n- 다중 테마 순환: 쉼표로 여러 주제 입력 시 순환 발행\n  예: '카페 마케팅, 디저트 레시피, 카페 인테리어'\n\n스타일 설정:\n- 글 방향: 정보 전달형 / 리뷰형 / 리스트형\n- 글 분량: 800자 / 1,500자 / 3,000자\n- 인용구 스타일: 따옴표, 버티컬 라인, 말풍선 등\n- 키워드 강조: 주제 키워드에 글색/배경색 자동 적용\n\n참고 글 URL을 입력하면 해당 글의 구성, 인용구, 색상, 이미지 흐름을 분석하여 비슷한 스타일로 작성합니다." },
          { title: "발행 일정 설정", body: "발행 시간과 간격을 설정합니다.\n\n시간대 설정:\n- 아침 (07:00~10:00)\n- 점심 (11:00~14:00)\n- 저녁 (18:00~21:00)\n- 오전 (07:00~12:00)\n- 오후 (13:00~20:00)\n- 사용자 지정\n\n발행 간격:\n- 최소 2시간 간격 권장\n- 일 발행 횟수 설정 (플랜에 따라 제한)\n\n카테고리 순환:\n- 여러 카테고리를 등록하면 순환하며 발행\n- 예: '맛집, 여행, 일상' 카테고리를 번갈아 사용" },
          { title: "구글 드라이브 자료 연결 (선택)", body: "원하는 사진과 자료를 활용한 자동 발행도 가능합니다.\n\n구글 드라이브 연결 방법:\n1. '원하는 사진 자동 운영' 옵션을 선택합니다\n2. 구글 드라이브 폴더 공유 링크를 입력합니다\n3. 폴더 내 이미지는 본문에 자동 삽입됩니다\n4. 텍스트/문서 파일은 글감으로 활용됩니다\n\n하위 폴더 포함 옵션을 켜면 폴더 구조 전체를 글감으로 사용합니다.\n\n직접 촬영한 사진이나 정리된 자료가 많은 쇼핑몰, 맛집, 부동산 업종에 특히 유용합니다." },
          { title: "운영 시작 및 모니터링", body: "모든 설정을 완료한 뒤 '자동 운영 시작' 버튼을 클릭합니다.\n\n운영 중 확인할 수 있는 정보:\n- 대시보드: 이번 주 발행 수, 성공률, 전체 발행 수\n- 최근 발행 목록: 발행된 글 제목과 URL\n- 자동 운영 상태: 현재 어떤 테마/카테고리로 운영 중인지\n- 다음 발행 예정 시간\n\n발행 성공/실패 시 Windows 데스크톱 알림이 표시됩니다. 실패한 글은 자동으로 1회 재시도됩니다.\n\n프로그램을 종료하면 자동 운영도 중단됩니다. 다시 실행하면 이전 설정이 유지되어 바로 재시작할 수 있습니다." },
        ],
      },
    ],
  },
  {
    id: "keyword",
    title: "키워드 분석",
    guides: [
      {
        id: "keyword-search",
        title: "트렌드 키워드 분석 및 활용",
        desc: "실시간 트렌드 키워드를 확인하고 콘텐츠 기획에 활용하는 방법",
        category: "분석",
        steps: [
          { title: "키워드 분석 도구 접속", body: "AI 도구에서 '키워드 분석'을 선택합니다.\n\n키워드 분석 도구는 네이버와 구글에서 실시간으로 수집한 320개 이상의 트렌드 키워드를 제공합니다.\n\n별도의 설정 없이 접속하면 바로 오늘의 트렌드 키워드 목록을 확인할 수 있습니다." },
          { title: "키워드 검색 및 분석", body: "관심 분야의 키워드를 직접 검색할 수도 있습니다.\n\n검색 결과에서 확인할 수 있는 정보:\n- 월간 검색량: 해당 키워드의 월별 검색 횟수\n- 경쟁도: 해당 키워드로 글을 올리는 경쟁자 수준\n- 연관 키워드: 함께 검색되는 관련 키워드\n- 롱테일 키워드: 더 구체적인 세부 키워드\n\n경쟁도가 낮고 검색량이 적당한 키워드를 선택하면 검색 노출 확률이 높아집니다." },
          { title: "키워드로 콘텐츠 바로 생성", body: "분석 결과에서 마음에 드는 키워드를 클릭하면 AI 글쓰기 도구로 바로 연결됩니다.\n\n활용 방법:\n1. 트렌드 키워드 목록에서 키워드를 선택합니다\n2. '이 키워드로 글쓰기' 버튼을 클릭합니다\n3. AI 글쓰기 화면에서 해당 키워드가 주제로 자동 입력됩니다\n4. 옵션을 조정하고 글을 생성합니다\n\n키워드 리포트를 저장해두면 콘텐츠 기획 시 참고할 수 있습니다." },
        ],
      },
    ],
  },
  {
    id: "sns-connect",
    title: "SNS 계정 연결",
    guides: [
      {
        id: "connect-sns",
        title: "SNS 플랫폼 계정 연결",
        desc: "인스타그램, 스레드 등 SNS 계정을 연결하여 웹에서 바로 발행합니다",
        category: "자동화",
        steps: [
          { title: "SNS 연결 관리 접속", body: "AI 도구에서 'SNS 연결 관리'를 선택합니다.\n\n현재 연결 가능한 플랫폼:\n- 네이버 블로그 (데스크톱 프로그램 필요)\n- 네이버 카페 (Business 플랜)\n- 인스타그램 (웹 발행)\n- 스레드 (웹 발행)\n\n각 플랫폼 옆의 '연결' 버튼을 클릭하면 해당 플랫폼의 로그인 화면이 열립니다." },
          { title: "계정 인증 및 권한 허용", body: "각 플랫폼에서 요구하는 로그인 및 권한 허용을 진행합니다.\n\n인스타그램/스레드의 경우:\n1. Facebook/Meta 계정으로 로그인합니다\n2. 연결할 인스타그램 계정을 선택합니다\n3. 게시 권한을 허용합니다\n\n연결이 완료되면 SNS 연결 관리 화면에서 '연결됨' 상태로 표시됩니다." },
          { title: "연결 상태 확인 및 발행", body: "연결된 계정은 AI 글쓰기 화면에서 발행 대상으로 선택할 수 있습니다.\n\n멀티 발행:\n- 한 번에 여러 플랫폼을 선택해서 동시 발행 가능\n- 각 플랫폼에 맞는 형식으로 자동 변환\n- 인스타그램: 이미지 + 캡션 + 해시태그\n- 스레드: 텍스트 위주의 짧은 포스트\n\n연결을 해제하려면 해당 플랫폼 옆의 '연결 해제' 버튼을 클릭합니다." },
        ],
      },
    ],
  },
  {
    id: "community",
    title: "커뮤니티 및 클래스",
    guides: [
      {
        id: "bootcamp",
        title: "성장 프로그램 참여",
        desc: "SNS 운영 성장 프로그램에 참여해서 다른 사업자들과 함께 성장합니다",
        category: "커뮤니티",
        steps: [
          { title: "성장 프로그램 페이지 접속", body: "상단 메뉴에서 '성장 프로그램'를 클릭하면 현재 진행 중인 성장 프로그램 목록을 확인할 수 있습니다.\n\n성장 프로그램 종류:\n- 블로그 30일 성장 프로그램: 매일 1개 블로그 글 작성\n- SNS 운영 실전: 매주 SNS 전략 수립 및 실행\n- 키워드 마스터: 키워드 분석 및 콘텐츠 기획\n\n각 성장 프로그램의 기간, 참여 인원, 보상 정보를 확인할 수 있습니다." },
          { title: "성장 프로그램 참여 신청", body: "원하는 성장 프로그램을 선택하고 '참여하기' 버튼을 클릭합니다.\n\n참여 시 확인 사항:\n- 성장 프로그램 기간 (시작일~종료일)\n- 일일 미션 내용\n- 인증 방법 (게시글 작성, 스크린샷 등)\n- 완주 보상 (포인트, 뱃지, 체험권 등)\n\n참여 후에는 마이페이지에서 현재 진행 중인 성장 프로그램과 달성률을 확인할 수 있습니다." },
          { title: "미션 수행 및 인증", body: "매일 제시되는 미션을 수행하고 커뮤니티 게시판에 인증 글을 작성합니다.\n\n인증 방법:\n1. 오늘의 미션을 확인합니다\n2. 미션을 수행합니다 (글 작성, 키워드 분석 등)\n3. 커뮤니티 게시판에 인증 글을 작성합니다\n4. 스크린샷이나 결과물을 첨부합니다\n\n다른 참가자의 인증 글에 좋아요와 댓글을 남기면 커뮤니티 점수가 쌓입니다. 꾸준히 참여하면 뱃지와 보상을 받을 수 있습니다." },
        ],
      },
      {
        id: "board-guide",
        title: "커뮤니티 게시판 활용",
        desc: "정보 공유, Q&A, 후기 게시판에서 다른 사용자들과 소통합니다",
        category: "커뮤니티",
        steps: [
          { title: "게시판 접속", body: "상단 메뉴에서 '커뮤니티'를 클릭하면 게시판 카테고리를 선택할 수 있습니다.\n\n게시판 종류:\n- 정보공유: SNS 운영 팁, 마케팅 전략 공유\n- 질문답변: 서비스 사용법이나 SNS 운영 관련 질문\n- 자유게시판: 자유로운 주제로 소통\n- 사용후기: 서비스 이용 후기와 성과 공유" },
          { title: "글 작성 및 소통", body: "게시판에서 '글쓰기' 버튼을 클릭하면 에디터가 열립니다.\n\n글 작성 기능:\n- 제목과 본문 입력\n- 이미지 첨부 (드래그앤드롭)\n- 카테고리/태그 선택\n\n작성한 글에 다른 사용자가 댓글을 달면 알림이 표시됩니다. 좋아요와 조회수로 인기 글을 확인할 수 있습니다." },
        ],
      },
    ],
  },
];

const CAT_COLORS = {
  "기본": "#3b82f6",
  "글쓰기": "#8b5cf6",
  "자동화": "#22c55e",
  "분석": "#f59e0b",
  "커뮤니티": "#ec4899",
};

export default function GuidePage({ C, navigate }) {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [filterCat, setFilterCat] = useState("all");

  const isDark = C.bg?.includes("0a") || C.bg?.includes("#10") || C.bg?.includes("242");
  const BG = isDark ? C.bg : "#fff";
  const BG2 = isDark ? "rgba(255,255,255,0.03)" : "#f9fafb";
  const BDR = C.border;
  const TEXT = C.text;
  const SUB = C.muted;

  const allGuides = GUIDE_SECTIONS.flatMap(s => s.guides);
  const filteredGuides = filterCat === "all" ? allGuides : allGuides.filter(g => g.category === filterCat);
  const categories = ["all", ...Object.keys(CAT_COLORS)];

  // 갤러리 상세 뷰
  if (selectedGuide) {
    const guide = selectedGuide;
    const color = CAT_COLORS[guide.category] || BRAND;
    const step = guide.steps[activeStep];
    const total = guide.steps.length;

    return (
      <div style={{ minHeight: "100vh", background: BG }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>
          {/* 뒤로가기 */}
          <button onClick={() => { setSelectedGuide(null); setActiveStep(0); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: BRAND, fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            가이드 목록으로
          </button>

          {/* 헤더 */}
          <div style={{ marginBottom: 32 }}>
            <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: color, background: `${color}10`, padding: "4px 12px", borderRadius: 99, marginBottom: 12 }}>{guide.category}</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: TEXT, margin: "0 0 8px", letterSpacing: -0.5 }}>{guide.title}</h1>
            <p style={{ fontSize: 15, color: SUB, margin: 0 }}>{guide.desc}</p>
          </div>

          {/* 스텝 프로그레스 */}
          <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
            {guide.steps.map((_, i) => (
              <div key={i} onClick={() => setActiveStep(i)} style={{
                flex: 1, height: 4, borderRadius: 2, cursor: "pointer",
                background: i <= activeStep ? color : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"),
                transition: "background 0.2s",
              }} />
            ))}
          </div>

          {/* 메인 콘텐츠 — 갤러리 카드 */}
          <div style={{ background: BG2, border: `1px solid ${BDR}`, borderRadius: 20, padding: "clamp(28px,4vw,48px)", marginBottom: 24, minHeight: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: color }}>
                {activeStep + 1}
              </div>
              <div>
                <div style={{ fontSize: 11, color: SUB, fontWeight: 600 }}>STEP {String(activeStep + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1.3 }}>{step.title}</div>
              </div>
            </div>
            <p style={{ fontSize: 16, color: isDark ? "rgba(255,255,255,0.7)" : "#374151", lineHeight: 1.8, margin: 0 }}>{step.body}</p>
          </div>

          {/* 네비게이션 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}
              style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${BDR}`, background: "transparent", color: activeStep === 0 ? (isDark ? "rgba(255,255,255,0.2)" : "#d0d0d0") : TEXT, fontSize: 14, fontWeight: 600, cursor: activeStep === 0 ? "default" : "pointer", fontFamily: "inherit" }}>
              이전
            </button>
            <span style={{ fontSize: 13, color: SUB, fontWeight: 600 }}>{activeStep + 1} / {total}</span>
            {activeStep < total - 1 ? (
              <button onClick={() => setActiveStep(activeStep + 1)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                다음
              </button>
            ) : (
              <button onClick={() => { setSelectedGuide(null); setActiveStep(0); }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                완료
              </button>
            )}
          </div>

          {/* 전체 단계 목록 */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: SUB, marginBottom: 12 }}>전체 단계</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {guide.steps.map((s, i) => (
                <div key={i} onClick={() => setActiveStep(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                    background: i === activeStep ? (isDark ? `${color}12` : `${color}06`) : "transparent",
                    border: `1px solid ${i === activeStep ? `${color}30` : "transparent"}`,
                    transition: "all 0.15s",
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    background: i < activeStep ? color : (i === activeStep ? `${color}15` : (isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6")),
                    color: i < activeStep ? "#fff" : (i === activeStep ? color : SUB),
                  }}>
                    {i < activeStep ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: i === activeStep ? 700 : 500, color: i === activeStep ? TEXT : SUB }}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 목록 뷰
  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: BRAND, background: `${BRAND}08`, border: `1px solid ${BRAND}20`, padding: "5px 14px", borderRadius: 99, marginBottom: 16 }}>
            Guide
          </span>
          <h1 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, color: TEXT, margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.2 }}>
            사용방법 안내
          </h1>
          <p style={{ fontSize: 16, color: SUB, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            SNS메이킷의 주요 기능을 단계별로 안내합니다. 카드를 클릭하면 상세 가이드를 확인할 수 있습니다.
          </p>
        </div>

        {/* 카테고리 필터 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 36, flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              style={{
                padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                background: filterCat === cat ? (cat === "all" ? BRAND : CAT_COLORS[cat]) : (isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6"),
                color: filterCat === cat ? "#fff" : SUB,
                transition: "all 0.15s",
              }}>
              {cat === "all" ? "전체" : cat}
            </button>
          ))}
        </div>

        {/* 가이드 카드 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
          {filteredGuides.map(guide => {
            const color = CAT_COLORS[guide.category] || BRAND;
            return (
              <div key={guide.id} onClick={() => setSelectedGuide(guide)}
                style={{
                  background: BG2, border: `1px solid ${BDR}`, borderRadius: 16, padding: "24px 22px",
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", flexDirection: "column",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = `${color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = BDR; }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}10`, padding: "3px 10px", borderRadius: 99 }}>{guide.category}</span>
                  <span style={{ fontSize: 11, color: SUB }}>{guide.steps.length}단계</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 8px", lineHeight: 1.35 }}>{guide.title}</h3>
                <p style={{ fontSize: 13, color: SUB, lineHeight: 1.6, margin: 0, flex: 1 }}>{guide.desc}</p>
                {/* 미니 스텝 프리뷰 */}
                <div style={{ display: "flex", gap: 3, marginTop: 16 }}>
                  {guide.steps.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: `${color}25` }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 섹션별 구분 */}
        {filterCat === "all" && (
          <div style={{ marginTop: 64 }}>
            {GUIDE_SECTIONS.map(section => (
              <div key={section.id} style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: BRAND }} />
                  {section.title}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
                  {section.guides.map(guide => {
                    const color = CAT_COLORS[guide.category] || BRAND;
                    return (
                      <div key={guide.id} onClick={() => setSelectedGuide(guide)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                          borderRadius: 12, border: `1px solid ${BDR}`, background: BG2, cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f0f4ff"; e.currentTarget.style.borderColor = `${color}30`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = BG2; e.currentTarget.style.borderColor = BDR; }}>
                        <div style={{ width: 4, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guide.title}</div>
                          <div style={{ fontSize: 12, color: SUB, marginTop: 2 }}>{guide.steps.length}단계</div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SUB} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
