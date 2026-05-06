!macro customInit
  ; 1) 실행 중인 앱 강제 종료 (설치 전 무조건 실행)
  nsExec::ExecToStack 'taskkill /f /im "${APP_EXECUTABLE_FILENAME}"'
  Sleep 500
  ; 혹시 남아있을 수 있는 Electron 관련 프로세스도 종료
  nsExec::ExecToStack 'taskkill /f /im "메이킷 SNS자동화.exe"'
  Sleep 500

  ; 2) 기존 설치 감지 → 자동 제거
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
  ${If} $0 == ""
    ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${EndIf}
  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONINFORMATION "이전 버전이 감지되었습니다.$\n$\n이전 버전을 자동으로 제거하고 새 버전을 설치합니다.$\n계속하시겠습니까?" IDNO abortInstall
      ; 사일런트 언인스톨 실행
      nsExec::ExecToStack 'taskkill /f /im "${APP_EXECUTABLE_FILENAME}"'
      nsExec::ExecToStack 'taskkill /f /im "메이킷 SNS자동화.exe"'
      Sleep 1000
      ; QuietUninstallString이 있으면 사일런트로, 없으면 일반으로
      ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
      ${If} $1 != ""
        ExecWait '$1'
      ${Else}
        ExecWait '"$0" /S'
      ${EndIf}
      Sleep 2000
      ; 제거 후 남은 파일 정리
      RMDir /r "$LOCALAPPDATA\Programs\${PRODUCT_FILENAME}"
      RMDir /r "$INSTDIR"
      Goto continueInstall
    abortInstall:
      Abort
    continueInstall:
  ${EndIf}
!macroend
