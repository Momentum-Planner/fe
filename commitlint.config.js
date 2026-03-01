export default {
  rules: {
    'header-match-pattern': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'header-match-pattern': ({ header }) => {
          const pattern = /^.+\(.+\): .+$/
          return [
            pattern.test(header),
            `커밋 메시지 형식을 맞춰주세요: 성격(범위): 요약\n예시: [feat](auth): 로그인 기능 추가`,
          ]
        },
      },
    },
  ],
}
