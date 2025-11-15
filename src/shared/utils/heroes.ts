const heroImages = import.meta.glob('../../../assets/dota2/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const heroImageMap = Object.entries(heroImages).reduce<Record<string, string>>((acc, [path, src]) => {
  const fileName = path.split('/').pop()
  if (!fileName) return acc
  const key = fileName.replace(/\.[^/.]+$/, '').toLowerCase()
  acc[key] = src
  return acc
}, {})

/**
 * 获取英雄图片路径
 * 支持直接heroId匹配和npc_dota_hero_前缀匹配
 * @returns 英雄图片路径，如果未找到则返回undefined
 */
export function getHeroImage(heroId?: string | null): string | undefined {
  if (!heroId) return undefined
  const normalized = heroId.toLowerCase()
  const direct = heroImageMap[normalized]
  if (direct) return direct
  const suffix = normalized.startsWith('npc_dota_hero_') ? normalized : `npc_dota_hero_${normalized}`
  return heroImageMap[suffix]
}

